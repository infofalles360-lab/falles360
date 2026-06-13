<?php
declare(strict_types=1);

function gamification_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', gamification_timezone());
}

function gamification_now_string(): string
{
    return gamification_now()->format('Y-m-d H:i:s');
}

function gamification_today_string(): string
{
    return gamification_now()->format('Y-m-d');
}

function gamification_registered_user_id(array $user): ?int
{
    $userId = (int) ($user['id'] ?? 0);
    $type = strtolower((string) ($user['type'] ?? 'guest'));

    if ($userId <= 0 || $type === 'guest') {
        return null;
    }

    return $userId;
}

function gamification_progress_percent(int $current, int $total): float
{
    if ($total <= 0) {
        return 0.0;
    }

    return round(($current / $total) * 100, 2);
}

function gamification_distance_meters(float $originLat, float $originLng, float $targetLat, float $targetLng): float
{
    $earthRadius = 6371000;
    $latFrom = deg2rad($originLat);
    $lngFrom = deg2rad($originLng);
    $latTo = deg2rad($targetLat);
    $lngTo = deg2rad($targetLng);

    $latDelta = $latTo - $latFrom;
    $lngDelta = $lngTo - $lngFrom;
    $a = sin($latDelta / 2) ** 2
        + cos($latFrom) * cos($latTo) * sin($lngDelta / 2) ** 2;
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

    return round($earthRadius * $c, 2);
}

function gamification_is_prized_falla(array $falla): bool
{
    return trim((string) ($falla['prize_text'] ?? '')) !== '';
}

function gamification_is_infantile_falla(array $falla): bool
{
    $haystack = mb_strtolower(trim(
        (string) ($falla['category'] ?? '') . ' ' . (string) ($falla['section_name'] ?? '') . ' ' . (string) ($falla['prize_text'] ?? '')
    ));

    return str_contains($haystack, 'infantil');
}

function gamification_is_special_section_falla(array $falla): bool
{
    return str_contains(mb_strtolower((string) ($falla['section_name'] ?? '')), 'especial');
}

function gamification_compare_metric(float|int $left, string $operator, float|int $right): bool
{
    return match ($operator) {
        '>' => $left > $right,
        '<' => $left < $right,
        '<=' => $left <= $right,
        '==' => $left === $right,
        '!=' => $left !== $right,
        default => $left >= $right,
    };
}

function gamification_metric_threshold_met(array $definition, array $context): bool
{
    $config = is_array($definition['rule_config'] ?? null)
        ? $definition['rule_config']
        : gamification_json_decode($definition['rule_config'] ?? null);
    $metric = (string) ($config['metric'] ?? '');
    $operator = (string) ($config['operator'] ?? '>=');
    $targetValue = (float) ($config['value'] ?? 0);
    $currentValue = (float) ($context[$metric] ?? 0);

    return $metric !== '' && gamification_compare_metric($currentValue, $operator, $targetValue);
}

function gamification_count_distinct_visited_fallas(int $userId): int
{
    return gamification_fetch_value(
        'SELECT COUNT(DISTINCT falla_id)
         FROM falla_visits
         WHERE user_id = :user_id',
        ['user_id' => $userId]
    );
}

function gamification_count_total_visits(int $userId): int
{
    return gamification_fetch_value(
        'SELECT COUNT(*)
         FROM falla_visits
         WHERE user_id = :user_id',
        ['user_id' => $userId]
    );
}

function gamification_count_content_reads(int $userId): int
{
    return gamification_fetch_value(
        "SELECT COUNT(DISTINCT source_id)
         FROM xp_events
         WHERE user_id = :user_id
           AND event_type = 'content_view'
           AND source_type = 'falla'
           AND amount > 0",
        ['user_id' => $userId]
    );
}

function gamification_count_navigation_uses(int $userId): int
{
    return gamification_fetch_value(
        "SELECT COUNT(*)
         FROM user_activity_log
         WHERE user_id = :user_id
           AND event_type = 'navigation_start'",
        ['user_id' => $userId]
    );
}

function gamification_count_unlocked_badges(int $userId): int
{
    return gamification_fetch_value(
        'SELECT COUNT(*)
         FROM user_badges
         WHERE user_id = :user_id',
        ['user_id' => $userId]
    );
}

function gamification_last_activity_at(int $userId): ?string
{
    $candidates = [];

    $activity = gamification_fetch_row(
        'SELECT MAX(occurred_at) AS value
         FROM user_activity_log
         WHERE user_id = :user_id',
        ['user_id' => $userId]
    );
    $visits = gamification_fetch_row(
        'SELECT MAX(visited_at) AS value
         FROM falla_visits
         WHERE user_id = :user_id',
        ['user_id' => $userId]
    );
    $xp = gamification_fetch_row(
        'SELECT MAX(occurred_at) AS value
         FROM xp_events
         WHERE user_id = :user_id',
        ['user_id' => $userId]
    );

    foreach ([$activity['value'] ?? null, $visits['value'] ?? null, $xp['value'] ?? null] as $value) {
        if (is_string($value) && trim($value) !== '') {
            $candidates[] = $value;
        }
    }

    if ($candidates === []) {
        return null;
    }

    rsort($candidates, SORT_STRING);

    return $candidates[0];
}

function gamification_build_route_models(int $userId): array
{
    $rows = gamification_fetch_route_status_rows($userId);

    return array_map(static function (array $row): array {
        $visited = (int) ($row['visited_fallas'] ?? 0);
        $total = (int) ($row['total_fallas'] ?? 0);
        $progressPercent = $total > 0 ? gamification_progress_percent($visited, $total) : 0.0;

        $row['progress_percent'] = $progressPercent;
        $row['is_completed'] = $total > 0
            ? ($progressPercent >= (float) ($row['min_completion_percentage'] ?? 100))
            : false;

        return gamification_route_model($row);
    }, $rows);
}

function gamification_build_zone_models(int $userId): array
{
    $rows = gamification_fetch_zone_status_rows($userId);

    return array_map(static function (array $row): array {
        $visited = (int) ($row['visited_fallas'] ?? 0);
        $total = (int) ($row['total_fallas'] ?? 0);
        $progressPercent = $total > 0 ? gamification_progress_percent($visited, $total) : 0.0;

        $row['progress_percent'] = $progressPercent;
        $row['is_completed'] = $total > 0 && $visited >= $total;

        return gamification_zone_model($row);
    }, $rows);
}

function gamification_build_neighborhood_models(int $userId): array
{
    $rows = gamification_fetch_neighborhood_progress_rows($userId);

    return array_map(static function (array $row): array {
        $total = (int) ($row['total_fallas'] ?? 0);
        $visited = (int) ($row['visited_fallas'] ?? 0);

        return [
            'neighborhood' => (string) ($row['neighborhood'] ?? ''),
            'total_fallas' => $total,
            'visited_fallas' => $visited,
            'progress_percent' => gamification_progress_percent($visited, $total),
            'is_completed' => $total > 0 && $visited >= $total,
            'last_visit_at' => $row['last_visit_at'] ?? null,
        ];
    }, $rows);
}

function gamification_badge_context(int $userId): array
{
    $zoneModels = gamification_build_zone_models($userId);

    $maxNeighborhoodVisits = gamification_fetch_row(
        "SELECT COALESCE(MAX(grouped.visited_total), 0) AS value
         FROM (
            SELECT COUNT(DISTINCT falla_visits.falla_id) AS visited_total
            FROM falla_visits
            INNER JOIN fallas ON fallas.id = falla_visits.falla_id
            WHERE falla_visits.user_id = :user_id
              AND COALESCE(NULLIF(TRIM(fallas.neighborhood), ''), '') <> ''
            GROUP BY fallas.neighborhood
         ) AS grouped",
        ['user_id' => $userId]
    );

    $maxSameDayVisits = gamification_fetch_row(
        "SELECT COALESCE(MAX(grouped.visited_total), 0) AS value
         FROM (
            SELECT visit_day, COUNT(DISTINCT falla_id) AS visited_total
            FROM falla_visits
            WHERE user_id = :user_id
            GROUP BY visit_day
         ) AS grouped",
        ['user_id' => $userId]
    );

    $consistentFallasDays = gamification_fetch_row(
        "SELECT COALESCE(MAX(grouped.days_total), 0) AS value
         FROM (
            SELECT visit_year, COUNT(*) AS days_total
            FROM (
                SELECT YEAR(visit_day) AS visit_year, visit_day
                FROM falla_visits
                WHERE user_id = :user_id
                  AND MONTH(visit_day) = 3
                  AND DAY(visit_day) BETWEEN 15 AND 19
                GROUP BY YEAR(visit_day), visit_day
                HAVING COUNT(DISTINCT falla_id) >= 2
            ) AS daily
            GROUP BY visit_year
         ) AS grouped",
        ['user_id' => $userId]
    );

    return [
        'distinct_visited_fallas' => gamification_count_distinct_visited_fallas($userId),
        'max_same_neighborhood_visits' => (int) ($maxNeighborhoodVisits['value'] ?? 0),
        'completed_routes' => gamification_fetch_value(
            'SELECT COUNT(*)
             FROM route_completions
             WHERE user_id = :user_id
               AND is_completed = 1',
            ['user_id' => $userId]
        ),
        'visited_prized_fallas' => gamification_fetch_value(
            "SELECT COUNT(DISTINCT falla_visits.falla_id)
             FROM falla_visits
             INNER JOIN fallas ON fallas.id = falla_visits.falla_id
             WHERE falla_visits.user_id = :user_id
               AND COALESCE(NULLIF(TRIM(fallas.prize_text), ''), '') <> ''",
            ['user_id' => $userId]
        ),
        'visited_infantile_fallas' => gamification_fetch_value(
            "SELECT COUNT(DISTINCT falla_visits.falla_id)
             FROM falla_visits
             INNER JOIN fallas ON fallas.id = falla_visits.falla_id
             WHERE falla_visits.user_id = :user_id
               AND (
                   fallas.category = 'infantil'
                   OR LOWER(COALESCE(fallas.section_name, '')) LIKE '%infantil%'
                   OR LOWER(COALESCE(fallas.prize_text, '')) LIKE '%infantil%'
               )",
            ['user_id' => $userId]
        ),
        'visited_special_section_fallas' => gamification_fetch_value(
            "SELECT COUNT(DISTINCT falla_visits.falla_id)
             FROM falla_visits
             INNER JOIN fallas ON fallas.id = falla_visits.falla_id
             WHERE falla_visits.user_id = :user_id
               AND LOWER(COALESCE(fallas.section_name, '')) LIKE '%especial%'",
            ['user_id' => $userId]
        ),
        'night_visits' => gamification_fetch_value(
            "SELECT COUNT(DISTINCT falla_id)
             FROM falla_visits
             WHERE user_id = :user_id
               AND (
                   TIME(visited_at) >= '20:00:00'
                   OR TIME(visited_at) < '02:00:00'
               )",
            ['user_id' => $userId]
        ),
        'max_same_day_visits' => (int) ($maxSameDayVisits['value'] ?? 0),
        'completed_content_reads' => gamification_count_content_reads($userId),
        'favorite_fallas_count' => gamification_count_distinct_favorite_fallas($userId),
        'completed_emblematic_zones' => count(array_filter(
            $zoneModels,
            static fn (array $zone): bool => $zone['is_emblematic'] && $zone['is_completed']
        )),
        'navigation_uses' => gamification_count_navigation_uses($userId),
        'consistent_fallas_days' => (int) ($consistentFallasDays['value'] ?? 0),
        'planta_day_visits' => gamification_fetch_value(
            "SELECT COUNT(DISTINCT falla_id)
             FROM falla_visits
             WHERE user_id = :user_id
               AND MONTH(visit_day) = 3
               AND DAY(visit_day) = 15",
            ['user_id' => $userId]
        ),
        'unlocked_badges_count' => gamification_count_unlocked_badges($userId),
    ];
}

function gamification_evaluate_badges(int $userId): array
{
    gamification_bootstrap();

    $activeBadges = gamification_fetch_badge_rows();
    $unlockedBySlug = [];

    foreach (gamification_fetch_user_badge_rows($userId) as $badge) {
        $unlockedBySlug[(string) $badge['slug']] = true;
    }

    $newBadges = [];

    for ($guard = 0; $guard < 4; $guard++) {
        $context = gamification_badge_context($userId);
        $unlockedThisPass = [];

        foreach ($activeBadges as $badge) {
            $slug = (string) ($badge['slug'] ?? '');

            if ($slug === '' || isset($unlockedBySlug[$slug])) {
                continue;
            }

            if (!gamification_metric_threshold_met($badge, $context)) {
                continue;
            }

            $badgeId = (int) ($badge['id'] ?? 0);
            if ($badgeId <= 0) {
                continue;
            }

            $unlockedAt = gamification_now_string();
            if (!gamification_insert_user_badge($userId, $badgeId, $unlockedAt)) {
                $unlockedBySlug[$slug] = true;
                continue;
            }

            gamification_insert_xp_event(
                $userId,
                'badge_unlock',
                'Insignia desbloqueada: ' . (string) $badge['name'],
                gamification_xp_value('badge_unlock'),
                'badge',
                $badgeId,
                'badge_unlock:' . $userId . ':' . $slug,
                ['badge_slug' => $slug, 'badge_name' => $badge['name']],
                $unlockedAt
            );
            gamification_insert_activity(
                $userId,
                'badge_unlocked',
                'Insignia desbloqueada',
                (string) $badge['name'],
                'badge',
                $badgeId,
                ['badge_slug' => $slug, 'badge_rarity' => $badge['rarity'] ?? 'common'],
                $unlockedAt
            );

            $badge['is_unlocked'] = true;
            $badge['unlocked_at'] = $unlockedAt;
            $unlockedThisPass[] = gamification_badge_model($badge);
            $unlockedBySlug[$slug] = true;
        }

        if ($unlockedThisPass === []) {
            break;
        }

        $newBadges = array_merge($newBadges, $unlockedThisPass);
    }

    return $newBadges;
}

function gamification_refresh_route_completions(int $userId): array
{
    $rows = gamification_fetch_route_status_rows($userId);
    $evaluatedAt = gamification_now_string();
    $newlyCompleted = [];
    $notifications = [];

    foreach ($rows as $row) {
        $routeId = (int) ($row['id'] ?? 0);
        $total = (int) ($row['total_fallas'] ?? 0);
        $visited = (int) ($row['visited_fallas'] ?? 0);
        $progressPercent = $total > 0 ? gamification_progress_percent($visited, $total) : 0.0;
        $isCompleted = $total > 0 && $progressPercent >= (float) ($row['min_completion_percentage'] ?? 100);
        $wasCompleted = (bool) ($row['is_completed'] ?? false);
        $completedAt = $isCompleted ? (($row['completed_at'] ?? null) ?: $evaluatedAt) : null;

        gamification_upsert_route_completion(
            $userId,
            $routeId,
            $visited,
            $total,
            $progressPercent,
            $isCompleted,
            $evaluatedAt,
            $completedAt
        );

        if (!$wasCompleted && $isCompleted) {
            gamification_insert_xp_event(
                $userId,
                'route_completed',
                'Ruta completada: ' . (string) $row['name'],
                gamification_xp_value('route_completed'),
                'route',
                $routeId,
                'route_completed:' . $userId . ':' . $routeId,
                ['route_slug' => $row['slug'] ?? null],
                $completedAt
            );
            gamification_insert_activity(
                $userId,
                'route_completed',
                'Ruta completada',
                (string) $row['name'],
                'route',
                $routeId,
                ['route_slug' => $row['slug'] ?? null, 'progress_percent' => $progressPercent],
                $completedAt
            );

            $routeModel = gamification_route_model([
                ...$row,
                'total_fallas' => $total,
                'visited_fallas' => $visited,
                'progress_percent' => $progressPercent,
                'is_completed' => true,
                'completed_at' => $completedAt,
                'last_evaluated_at' => $evaluatedAt,
            ]);
            $newlyCompleted[] = $routeModel;
            $notifications[] = gamification_notification_payload(
                'route_completed',
                'Ruta completada',
                $routeModel['name'],
                $routeModel
            );
        }
    }

    return [
        'newly_completed_routes' => $newlyCompleted,
        'notifications' => $notifications,
    ];
}

function gamification_rebuild_profile(int $userId): array
{
    gamification_bootstrap();

    $xpTotal = gamification_sum_xp_total($userId);
    $level = gamification_level_for_xp($xpTotal);
    $routeModels = gamification_build_route_models($userId);
    $zoneModels = gamification_build_zone_models($userId);
    $neighborhoodModels = gamification_build_neighborhood_models($userId);
    $totalFallas = gamification_total_active_fallas();
    $distinctVisited = gamification_count_distinct_visited_fallas($userId);
    $totalVisitEvents = gamification_count_total_visits($userId);
    $completedRoutes = count(array_filter($routeModels, static fn (array $route): bool => $route['is_completed']));
    $startedRoutes = count(array_filter($routeModels, static fn (array $route): bool => $route['visited_fallas'] > 0));
    $neighborhoodsExplored = count(array_filter($neighborhoodModels, static fn (array $item): bool => $item['visited_fallas'] > 0));
    $neighborhoodsCompleted = count(array_filter($neighborhoodModels, static fn (array $item): bool => $item['is_completed']));
    $badgesUnlocked = gamification_count_unlocked_badges($userId);
    $favoriteFallasCount = gamification_count_distinct_favorite_fallas($userId);
    $contentReadsCount = gamification_count_content_reads($userId);
    $navigationUsesCount = gamification_count_navigation_uses($userId);
    $fallaCompletionPercent = gamification_progress_percent($distinctVisited, $totalFallas);
    $routeCompletionPercent = gamification_progress_percent($completedRoutes, max(1, gamification_count_active_routes()));
    $badgeCompletionPercent = gamification_progress_percent($badgesUnlocked, max(1, gamification_count_active_badges()));
    $neighborhoodCompletionPercent = gamification_progress_percent($neighborhoodsCompleted, max(1, gamification_count_known_neighborhoods()));
    $zoneCompletionPercent = gamification_progress_percent(
        count(array_filter($zoneModels, static fn (array $zone): bool => $zone['is_completed'])),
        max(1, count($zoneModels))
    );

    $metrics = [$fallaCompletionPercent, $routeCompletionPercent, $badgeCompletionPercent];
    if (count($neighborhoodModels) > 0) {
        $metrics[] = $neighborhoodCompletionPercent;
    }
    if (count($zoneModels) > 0) {
        $metrics[] = $zoneCompletionPercent;
    }

    $summaryRow = [
        'xp_total' => $xpTotal,
        'level_number' => $level['number'],
        'level_name' => $level['name'],
        'level_progress_percent' => $level['progress_percent'],
        'current_level_xp' => $level['min_xp'],
        'next_level_xp' => $level['next_xp'],
        'distinct_fallas_visited' => $distinctVisited,
        'total_visit_events' => $totalVisitEvents,
        'routes_completed' => $completedRoutes,
        'routes_started' => $startedRoutes,
        'neighborhoods_explored' => $neighborhoodsExplored,
        'neighborhoods_completed' => $neighborhoodsCompleted,
        'badges_unlocked' => $badgesUnlocked,
        'favorite_fallas_count' => $favoriteFallasCount,
        'content_reads_count' => $contentReadsCount,
        'navigation_uses_count' => $navigationUsesCount,
        'total_progress_percent' => round(array_sum($metrics) / max(1, count($metrics)), 2),
        'fallas_completion_percent' => $fallaCompletionPercent,
        'last_activity_at' => gamification_last_activity_at($userId),
    ];

    gamification_update_profile_row($userId, $summaryRow);

    $profile = gamification_profile_model(gamification_fetch_profile_row($userId));
    $profile['catalog_totals'] = [
        'total_fallas' => $totalFallas,
        'total_badges' => gamification_count_active_badges(),
        'total_routes' => count($routeModels),
        'total_neighborhoods' => count($neighborhoodModels),
        'total_zones' => count($zoneModels),
    ];
    $profile['totals']['visited_falla_ids'] = gamification_fetch_visited_falla_ids($userId);

    return $profile;
}

function gamification_finalize_progress(int $userId, int $previousLevelNumber, array $notifications = []): array
{
    $newBadges = gamification_evaluate_badges($userId);
    $profile = gamification_rebuild_profile($userId);

    foreach ($newBadges as $badge) {
        $notifications[] = gamification_notification_payload(
            'badge_unlocked',
            'Nueva insignia',
            $badge['name'],
            $badge
        );
    }

    $currentLevelNumber = (int) ($profile['level']['number'] ?? 1);
    if ($currentLevelNumber > $previousLevelNumber) {
        gamification_insert_activity(
            $userId,
            'level_up',
            'Subida de nivel',
            (string) ($profile['level']['name'] ?? 'Nivel actualizado'),
            'profile',
            $userId,
            ['level_number' => $currentLevelNumber],
            gamification_now_string()
        );
        $notifications[] = gamification_notification_payload(
            'level_up',
            'Nuevo nivel',
            (string) ($profile['level']['name'] ?? 'Nivel actualizado'),
            $profile['level']
        );
    }

    return [
        'profile' => $profile,
        'notifications' => $notifications,
        'new_badges' => $newBadges,
        'recent_activity' => gamification_recent_activity($userId, 10),
    ];
}

function gamification_recent_activity(int $userId, int $limit = 12): array
{
    return array_map('gamification_activity_model', gamification_fetch_recent_activity_rows($userId, $limit));
}

function gamification_routes_progress(int $userId): array
{
    return gamification_build_route_models($userId);
}

function gamification_zone_progress(int $userId): array
{
    $curatedZones = gamification_build_zone_models($userId);

    return [
        'curated_zones' => $curatedZones,
        'completed_zones' => count(array_filter($curatedZones, static fn (array $zone): bool => $zone['is_completed'])),
    ];
}

function gamification_neighborhood_progress(int $userId): array
{
    $items = gamification_build_neighborhood_models($userId);

    return [
        'items' => $items,
        'completed_neighborhoods' => count(array_filter($items, static fn (array $item): bool => $item['is_completed'])),
        'explored_neighborhoods' => count(array_filter($items, static fn (array $item): bool => $item['visited_fallas'] > 0)),
    ];
}

function gamification_badges_catalog(int $userId): array
{
    return array_map('gamification_badge_model', gamification_fetch_badge_rows($userId));
}

function gamification_user_badges(int $userId): array
{
    return array_map('gamification_badge_model', gamification_fetch_user_badge_rows($userId));
}

function gamification_stats_bundle(int $userId): array
{
    return [
        'profile' => gamification_rebuild_profile($userId),
        'xp_breakdown' => array_map(static function (array $row): array {
            return [
                'event_type' => (string) ($row['event_type'] ?? ''),
                'xp_total' => (int) ($row['xp_total'] ?? 0),
                'events_total' => (int) ($row['events_total'] ?? 0),
            ];
        }, gamification_fetch_xp_breakdown_rows($userId)),
        'context' => gamification_badge_context($userId),
    ];
}

function gamification_profile_bundle(int $userId): array
{
    gamification_bootstrap();

    $previousLevel = (int) ((gamification_fetch_profile_row($userId)['level_number'] ?? 1));
    $routeRefresh = gamification_refresh_route_completions($userId);
    $final = gamification_finalize_progress($userId, $previousLevel, $routeRefresh['notifications']);

    return [
        'profile' => $final['profile'],
        'routes' => gamification_routes_progress($userId),
        'zones' => gamification_zone_progress($userId),
        'neighborhoods' => gamification_neighborhood_progress($userId),
        'recent_activity' => $final['recent_activity'],
        'notifications' => $final['notifications'],
        'new_badges' => $final['new_badges'],
        'newly_completed_routes' => $routeRefresh['newly_completed_routes'],
    ];
}

function gamification_register_visit(
    int $userId,
    int $fallaId,
    float $latitude,
    float $longitude,
    ?int $radiusMeters = null,
    string $visitSource = 'gps'
): array {
    gamification_bootstrap();

    $falla = gamification_find_falla($fallaId);
    if ($falla === null) {
        throw new InvalidArgumentException('La falla indicada no existe.');
    }

    $targetLat = (float) ($falla['latitude'] ?? 0);
    $targetLng = (float) ($falla['longitude'] ?? 0);
    if ($targetLat === 0.0 || $targetLng === 0.0) {
        throw new InvalidArgumentException('La falla no tiene coordenadas válidas para verificar la visita.');
    }

    $radius = $radiusMeters !== null && $radiusMeters > 0
        ? $radiusMeters
        : gamification_default_visit_radius_meters();
    $distanceMeters = gamification_distance_meters($latitude, $longitude, $targetLat, $targetLng);

    if ($distanceMeters > $radius) {
        throw new InvalidArgumentException('Debes estar más cerca de la falla para validar la visita.');
    }

    $visitDay = gamification_today_string();
    $visitedAt = gamification_now_string();
    $existingVisit = gamification_has_visit_for_day($userId, $fallaId, $visitDay);
    $previousLevel = (int) ((gamification_fetch_profile_row($userId)['level_number'] ?? 1));

    if ($existingVisit !== null) {
        $bundle = gamification_profile_bundle($userId);
        $bundle['already_recorded'] = true;
        $bundle['distance_meters'] = $distanceMeters;
        $bundle['visit'] = $existingVisit;

        return $bundle;
    }

    $visit = gamification_insert_visit(
        $userId,
        $fallaId,
        $latitude,
        $longitude,
        $distanceMeters,
        $radius,
        $visitSource,
        $visitedAt,
        $visitDay
    );

    gamification_insert_activity(
        $userId,
        'falla_visit',
        'Falla visitada',
        (string) ($falla['name'] ?? 'Falla'),
        'falla',
        $fallaId,
        [
            'distance_meters' => $distanceMeters,
            'visit_source' => $visitSource,
        ],
        $visitedAt
    );
    gamification_insert_xp_event(
        $userId,
        'falla_visit',
        'Visita validada a ' . (string) ($falla['name'] ?? 'falla'),
        gamification_xp_value('falla_visit'),
        'falla_visit',
        (int) ($visit['id'] ?? 0),
        'falla_visit:' . $userId . ':' . $fallaId . ':' . $visitDay,
        ['falla_id' => $fallaId, 'falla_slug' => $falla['slug'] ?? null],
        $visitedAt
    );

    if (gamification_is_prized_falla($falla)) {
        gamification_insert_xp_event(
            $userId,
            'prized_falla_visit',
            'Visita premiada: ' . (string) ($falla['name'] ?? 'falla'),
            gamification_xp_value('prized_falla_visit'),
            'falla_visit',
            (int) ($visit['id'] ?? 0),
            'prized_falla_visit:' . $userId . ':' . $fallaId . ':' . $visitDay,
            ['falla_id' => $fallaId],
            $visitedAt
        );
    }

    if (gamification_is_infantile_falla($falla)) {
        gamification_insert_xp_event(
            $userId,
            'infantile_falla_visit',
            'Visita infantil: ' . (string) ($falla['name'] ?? 'falla'),
            gamification_xp_value('infantile_falla_visit'),
            'falla_visit',
            (int) ($visit['id'] ?? 0),
            'infantile_falla_visit:' . $userId . ':' . $fallaId . ':' . $visitDay,
            ['falla_id' => $fallaId],
            $visitedAt
        );
    }

    $routeRefresh = gamification_refresh_route_completions($userId);
    $final = gamification_finalize_progress($userId, $previousLevel, $routeRefresh['notifications']);
    $notifications = array_merge([
        gamification_notification_payload(
            'visit_registered',
            'Visita validada',
            (string) ($falla['name'] ?? 'Falla'),
            [
                'distance_meters' => $distanceMeters,
                'radius_meters' => $radius,
            ]
        ),
    ], $final['notifications']);

    return [
        'profile' => $final['profile'],
        'routes' => gamification_routes_progress($userId),
        'zones' => gamification_zone_progress($userId),
        'neighborhoods' => gamification_neighborhood_progress($userId),
        'recent_activity' => $final['recent_activity'],
        'notifications' => $notifications,
        'new_badges' => $final['new_badges'],
        'newly_completed_routes' => $routeRefresh['newly_completed_routes'],
        'distance_meters' => $distanceMeters,
        'already_recorded' => false,
        'visit' => $visit,
    ];
}

function gamification_track_favorite_added(int $userId, int $fallaId): array
{
    gamification_bootstrap();

    $falla = gamification_find_falla($fallaId);
    $previousLevel = (int) ((gamification_fetch_profile_row($userId)['level_number'] ?? 1));
    $occurredAt = gamification_now_string();

    gamification_insert_activity(
        $userId,
        'favorite_added',
        'Falla guardada',
        (string) ($falla['name'] ?? 'Falla favorita'),
        'falla',
        $fallaId,
        [],
        $occurredAt
    );
    gamification_insert_xp_event(
        $userId,
        'favorite_added',
        'Favorito añadido',
        gamification_xp_value('favorite_added'),
        'falla',
        $fallaId,
        'favorite_added:' . $userId . ':' . $fallaId,
        [],
        $occurredAt
    );

    return gamification_finalize_progress($userId, $previousLevel, [
        gamification_notification_payload(
            'favorite_added',
            'Falla guardada',
            (string) ($falla['name'] ?? 'Favorita'),
            ['falla_id' => $fallaId]
        ),
    ]);
}

function gamification_track_navigation_use(int $userId, int $fallaId, string $mode = 'internal'): array
{
    gamification_bootstrap();

    $falla = gamification_find_falla($fallaId);
    $previousLevel = (int) ((gamification_fetch_profile_row($userId)['level_number'] ?? 1));

    gamification_insert_activity(
        $userId,
        'navigation_start',
        'Navegación iniciada',
        (string) ($falla['name'] ?? 'Ruta'),
        'falla',
        $fallaId,
        ['mode' => $mode],
        gamification_now_string()
    );

    return gamification_finalize_progress($userId, $previousLevel, [
        gamification_notification_payload(
            'navigation_start',
            'Cómo llegar abierto',
            (string) ($falla['name'] ?? 'Ruta'),
            ['falla_id' => $fallaId, 'mode' => $mode]
        ),
    ]);
}

function gamification_track_content_view(int $userId, int $fallaId, string $section = 'history'): array
{
    gamification_bootstrap();

    $falla = gamification_find_falla($fallaId);
    $previousLevel = (int) ((gamification_fetch_profile_row($userId)['level_number'] ?? 1));
    $occurredAt = gamification_now_string();

    $awarded = gamification_insert_xp_event(
        $userId,
        'content_view',
        'Ficha cultural completada',
        gamification_xp_value('content_view'),
        'falla',
        $fallaId,
        'content_view:' . $userId . ':' . $fallaId,
        ['section' => $section],
        $occurredAt
    );

    if ($awarded) {
        gamification_insert_activity(
            $userId,
            'content_read',
            'Ficha leída',
            (string) ($falla['name'] ?? 'Ficha fallera'),
            'falla',
            $fallaId,
            ['section' => $section],
            $occurredAt
        );
    }

    $notifications = $awarded
        ? [gamification_notification_payload(
            'content_read',
            'Lectura registrada',
            (string) ($falla['name'] ?? 'Ficha fallera'),
            ['falla_id' => $fallaId]
        )]
        : [];

    return gamification_finalize_progress($userId, $previousLevel, $notifications);
}

function gamification_mark_routes_completed(int $userId): array
{
    gamification_bootstrap();

    $previousLevel = (int) ((gamification_fetch_profile_row($userId)['level_number'] ?? 1));
    $routeRefresh = gamification_refresh_route_completions($userId);
    $final = gamification_finalize_progress($userId, $previousLevel, $routeRefresh['notifications']);

    return [
        'profile' => $final['profile'],
        'routes' => gamification_routes_progress($userId),
        'notifications' => $final['notifications'],
        'new_badges' => $final['new_badges'],
        'newly_completed_routes' => $routeRefresh['newly_completed_routes'],
        'recent_activity' => $final['recent_activity'],
    ];
}
