<?php

declare(strict_types=1);

function map_heat_parse_bbox(?string $rawBbox): ?array
{
    $rawBbox = trim((string) $rawBbox);
    if ($rawBbox === '') {
        return null;
    }

    try {
        return app_validate_bbox($rawBbox, 'bbox');
    } catch (InvalidArgumentException $exception) {
        return null;
    }
}

function map_heat_normalize_zoom(int $zoom): int
{
    return max(10, min(18, $zoom));
}

function map_heat_range_seconds(string $range): int
{
    return match (strtolower(trim($range))) {
        '15m' => 15 * 60,
        '30m' => 30 * 60,
        '6h' => 6 * 60 * 60,
        '12h' => 12 * 60 * 60,
        '24h' => 24 * 60 * 60,
        default => 60 * 60,
    };
}

function map_heat_range_start(int $seconds): string
{
    return gmdate('Y-m-d H:i:s', time() - max(300, $seconds));
}

function activity_event_weights(): array
{
    return [
        'marker_open' => 2,
        'detail_open' => 3,
        'route_prepare' => 5,
        'favorite_toggle' => 2,
        'share_open' => 1,
    ];
}

function activity_event_allowed_types(): array
{
    return array_keys(activity_event_weights());
}

function activity_event_weight(string $eventType): int
{
    $weights = activity_event_weights();

    return (int) ($weights[$eventType] ?? 1);
}

function activity_event_record(?int $userId, ?int $fallaId, string $eventType, float $latitude, float $longitude): void
{
    $eventType = app_validate_enum($eventType, 'event_type', activity_event_allowed_types());
    $latitude = app_validate_coordinate($latitude, 'latitude', 'latitude');
    $longitude = app_validate_coordinate($longitude, 'longitude', 'longitude');

    if ($latitude === 0.0 || $longitude === 0.0) {
        throw new InvalidArgumentException('Coordenadas no validas.');
    }

    $statement = db()->prepare(
        'INSERT INTO activity_events (
            user_id,
            falla_id,
            event_type,
            weight,
            latitude,
            longitude
         ) VALUES (
            :user_id,
            :falla_id,
            :event_type,
            :weight,
            :latitude,
            :longitude
         )'
    );

    $statement->bindValue(':user_id', $userId, $userId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $statement->bindValue(':falla_id', $fallaId, $fallaId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $statement->bindValue(':event_type', $eventType, PDO::PARAM_STR);
    $statement->bindValue(':weight', activity_event_weight($eventType), PDO::PARAM_INT);
    $statement->bindValue(':latitude', $latitude);
    $statement->bindValue(':longitude', $longitude);
    $statement->execute();
}

function map_heat_precision_for_zoom(int $zoom): int
{
    return match (true) {
        $zoom >= 16 => 4,
        $zoom >= 14 => 3,
        default => 2,
    };
}

function map_heat_fetch_event_rows(array $bbox, string $rangeStart): array
{
    return dashboard_fetch_all(
        "SELECT
            activity_events.latitude,
            activity_events.longitude,
            activity_events.weight,
            activity_events.falla_id,
            activity_events.created_at,
            fallas.name AS falla_name,
            fallas.section_name,
            fallas.neighborhood
         FROM activity_events
         LEFT JOIN fallas
           ON fallas.id = activity_events.falla_id
         WHERE activity_events.latitude BETWEEN :south AND :north
           AND activity_events.longitude BETWEEN :west AND :east
           AND activity_events.created_at >= :range_start
         ORDER BY activity_events.created_at DESC, activity_events.id DESC",
        [
            'south' => $bbox['south'],
            'north' => $bbox['north'],
            'west' => $bbox['west'],
            'east' => $bbox['east'],
            'range_start' => $rangeStart,
        ]
    );
}

function map_heat_build_payload(array $bbox, int $zoom, string $range): array
{
    $rows = map_heat_fetch_event_rows(
        $bbox,
        map_heat_range_start(map_heat_range_seconds($range))
    );

    if ($rows === []) {
        return [
            'heatpoints' => [],
            'top_fallas' => [],
            'updated_at' => gmdate('c'),
            'highlights' => [
                'hottest_zone_label' => null,
                'top_falla' => null,
                'top_neighborhood' => null,
            ],
        ];
    }

    $precision = map_heat_precision_for_zoom(map_heat_normalize_zoom($zoom));
    $cells = [];
    $trending = [];
    $neighborhoods = [];

    foreach ($rows as $row) {
        $lat = round((float) ($row['latitude'] ?? 0), $precision);
        $lng = round((float) ($row['longitude'] ?? 0), $precision);
        $weight = max(0.0, (float) ($row['weight'] ?? 0));

        if ($lat === 0.0 || $lng === 0.0 || $weight <= 0.0) {
            continue;
        }

        $cellKey = number_format($lat, $precision, '.', '') . ':' . number_format($lng, $precision, '.', '');
        if (!isset($cells[$cellKey])) {
            $cells[$cellKey] = [
                'lat' => $lat,
                'lng' => $lng,
                'score' => 0.0,
            ];
        }

        $cells[$cellKey]['score'] += $weight;

        $fallaId = (int) ($row['falla_id'] ?? 0);
        if ($fallaId > 0) {
            if (!isset($trending[$fallaId])) {
                $trending[$fallaId] = [
                    'id' => $fallaId,
                    'name' => trim((string) ($row['falla_name'] ?? '')),
                    'section_name' => trim((string) ($row['section_name'] ?? '')),
                    'score' => 0.0,
                ];
            }

            $trending[$fallaId]['score'] += $weight;
        }

        $neighborhood = trim((string) ($row['neighborhood'] ?? ''));
        if ($neighborhood !== '') {
            if (!isset($neighborhoods[$neighborhood])) {
                $neighborhoods[$neighborhood] = [
                    'name' => $neighborhood,
                    'score' => 0.0,
                ];
            }

            $neighborhoods[$neighborhood]['score'] += $weight;
        }
    }

    $maxScore = 1.0;
    foreach ($cells as $cell) {
        $maxScore = max($maxScore, (float) ($cell['score'] ?? 0.0));
    }

    $heatpoints = array_values(array_map(
        static function (array $cell) use ($maxScore): array {
            $normalized = min(max(((float) ($cell['score'] ?? 0.0)) / $maxScore, 0.0), 1.0);

            return [
                'lat' => (float) ($cell['lat'] ?? 0),
                'lng' => (float) ($cell['lng'] ?? 0),
                'intensity' => round($normalized, 4),
            ];
        },
        array_values($cells)
    ));

    usort(
        $heatpoints,
        static fn (array $left, array $right): int => ($right['intensity'] <=> $left['intensity'])
    );

    $trendingValues = array_values($trending);
    usort(
        $trendingValues,
        static fn (array $left, array $right): int => ($right['score'] <=> $left['score'])
    );

    $neighborhoodValues = array_values($neighborhoods);
    usort(
        $neighborhoodValues,
        static fn (array $left, array $right): int => ($right['score'] <=> $left['score'])
    );

    $topFalla = $trendingValues[0] ?? null;
    $topNeighborhood = $neighborhoodValues[0] ?? null;

    return [
        'heatpoints' => $heatpoints,
        'top_fallas' => array_values(array_map(
            static fn (array $item): int => (int) ($item['id'] ?? 0),
            array_slice($trendingValues, 0, 8)
        )),
        'updated_at' => gmdate('c'),
        'highlights' => [
            'hottest_zone_label' => $topNeighborhood['name'] ?? ($topFalla['name'] ?? null),
            'top_falla' => $topFalla !== null ? [
                'id' => (int) ($topFalla['id'] ?? 0),
                'name' => (string) ($topFalla['name'] ?? ''),
                'section_name' => (string) ($topFalla['section_name'] ?? ''),
                'score' => round((float) ($topFalla['score'] ?? 0.0), 2),
            ] : null,
            'top_neighborhood' => $topNeighborhood !== null ? [
                'name' => (string) ($topNeighborhood['name'] ?? ''),
                'score' => round((float) ($topNeighborhood['score'] ?? 0.0), 2),
            ] : null,
        ],
    ];
}
