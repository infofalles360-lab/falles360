<?php
declare(strict_types=1);

function app_public_user_id(array $user): ?int
{
    $id = (int) ($user['id'] ?? 0);

    return $id > 0 ? $id : null;
}

function app_public_is_guest(array $user): bool
{
    return strtolower((string) ($user['type'] ?? 'guest')) === 'guest';
}

function app_public_safe_image_url(?string $url): string
{
    $value = trim((string) ($url ?? ''));

    if ($value === '') {
        return app_public_fallback_image();
    }

    if (str_starts_with($value, 'data:image/')) {
        return $value;
    }

    $scheme = strtolower((string) parse_url($value, PHP_URL_SCHEME));

    if (in_array($scheme, ['http', 'https'], true) && filter_var($value, FILTER_VALIDATE_URL)) {
        return $value;
    }

    return app_public_fallback_image();
}

function app_public_favorite_column(string $type): array
{
    $normalizedType = app_validate_enum($type, 'type', ['falla', 'event']);

    return $normalizedType === 'event'
        ? ['type' => 'event', 'bucket' => 'events', 'column' => 'event_id', 'table' => 'events']
        : ['type' => 'falla', 'bucket' => 'fallas', 'column' => 'falla_id', 'table' => 'fallas'];
}

function app_public_assert_favorite_target_exists(string $type, int $id): void
{
    $mapping = app_public_favorite_column($type);
    $statement = db()->prepare(
        "SELECT id
         FROM {$mapping['table']}
         WHERE id = :id
         LIMIT 1"
    );
    $statement->execute(['id' => $id]);

    if ($statement->fetch() === false) {
        throw new InvalidArgumentException('Elemento no valido.');
    }
}

function app_public_fallback_image(): string
{
    $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffc3a6"/>
      <stop offset="100%" stop-color="#ff7b55"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <circle cx="260" cy="220" r="160" fill="rgba(255,255,255,0.16)"/>
  <circle cx="920" cy="720" r="180" fill="rgba(255,255,255,0.10)"/>
  <path d="M600 150 650 280 790 300 690 390 720 530 600 455 480 530 510 390 410 300 550 280Z" fill="rgba(255,255,255,0.22)"/>
  <text x="600" y="700" text-anchor="middle" fill="#fff7f0" font-family="Arial, sans-serif" font-size="88" font-weight="700">Falles360</text>
  <text x="600" y="780" text-anchor="middle" fill="rgba(255,247,240,0.88)" font-family="Arial, sans-serif" font-size="36">Imagen pendiente</text>
</svg>
SVG;

    return 'data:image/svg+xml;charset=UTF-8,' . rawurlencode($svg);
}

function app_public_route_destination(float $latitude, float $longitude, string $address = '', string $fallbackLabel = ''): string
{
    if ($latitude !== 0.0 && $longitude !== 0.0) {
        return $latitude . ',' . $longitude;
    }

    $address = trim($address);
    if ($address !== '') {
        return $address;
    }

    $fallbackLabel = trim($fallbackLabel);
    if ($fallbackLabel !== '') {
        return $fallbackLabel . ', Valencia';
    }

    return 'Valencia';
}

function app_public_route_url(float $latitude, float $longitude, string $address = '', string $fallbackLabel = ''): string
{
    return 'https://www.google.com/maps/dir/?api=1&destination=' . rawurlencode(
        app_public_route_destination($latitude, $longitude, $address, $fallbackLabel)
    );
}

function app_public_apple_maps_url(float $latitude, float $longitude, string $address = '', string $fallbackLabel = ''): string
{
    return 'https://maps.apple.com/?daddr=' . rawurlencode(
        app_public_route_destination($latitude, $longitude, $address, $fallbackLabel)
    );
}

function app_public_session_favorites(): array
{
    if (!isset($_SESSION['public_app_favorites']) || !is_array($_SESSION['public_app_favorites'])) {
        $_SESSION['public_app_favorites'] = [
            'fallas' => [],
            'events' => [],
        ];
    }

    return $_SESSION['public_app_favorites'];
}

function app_public_set_session_favorites(array $favorites): void
{
    $_SESSION['public_app_favorites'] = [
        'fallas' => array_values(array_unique(array_map('intval', $favorites['fallas'] ?? []))),
        'events' => array_values(array_unique(array_map('intval', $favorites['events'] ?? []))),
    ];
}

function app_public_favorite_ids(array $user, string $type): array
{
    $mapping = app_public_favorite_column($type);
    $userId = app_public_user_id($user);

    if ($userId === null) {
        $favorites = app_public_session_favorites();

        return array_map('intval', $favorites[$mapping['bucket']] ?? []);
    }

    $rows = dashboard_fetch_all(
        "SELECT {$mapping['column']} AS item_id
         FROM favorites
         WHERE user_id = :user_id
           AND {$mapping['column']} IS NOT NULL",
        ['user_id' => $userId]
    );

    return array_values(array_map(static fn (array $row): int => (int) ($row['item_id'] ?? 0), $rows));
}

function app_public_toggle_favorite(array $user, string $type, int $id): array
{
    $mapping = app_public_favorite_column($type);
    $normalizedType = $mapping['type'];
    $userId = app_public_user_id($user);
    app_public_assert_favorite_target_exists($normalizedType, $id);

    if ($userId === null) {
        $favorites = app_public_session_favorites();
        $bucket = $mapping['bucket'];
        $ids = array_map('intval', $favorites[$bucket] ?? []);
        $exists = in_array($id, $ids, true);

        if ($exists) {
            $ids = array_values(array_filter($ids, static fn (int $value): bool => $value !== $id));
        } else {
            $ids[] = $id;
        }

        $favorites[$bucket] = $ids;
        app_public_set_session_favorites($favorites);

        return [
            'favorite' => !$exists,
            'favorites' => $favorites,
        ];
    }

    $exists = dashboard_fetch_row(
        "SELECT id
         FROM favorites
         WHERE user_id = :user_id
           AND {$mapping['column']} = :item_id
         LIMIT 1",
        [
            'user_id' => $userId,
            'item_id' => $id,
        ]
    );

    if ($exists !== null) {
        $statement = db()->prepare("DELETE FROM favorites WHERE user_id = :user_id AND {$mapping['column']} = :item_id");
        $statement->execute([
            'user_id' => $userId,
            'item_id' => $id,
        ]);

        return [
            'favorite' => false,
            'favorites' => [
                'fallas' => app_public_favorite_ids($user, 'falla'),
                'events' => app_public_favorite_ids($user, 'event'),
            ],
        ];
    }

    $statement = db()->prepare(
        "INSERT INTO favorites (user_id, {$mapping['column']})
         VALUES (:user_id, :item_id)"
    );
    $statement->execute([
        'user_id' => $userId,
        'item_id' => $id,
    ]);

    return [
        'favorite' => true,
        'favorites' => [
            'fallas' => app_public_favorite_ids($user, 'falla'),
            'events' => app_public_favorite_ids($user, 'event'),
        ],
    ];
}

function app_public_format_falla(array $row, array $favoriteIds = []): array
{
    $latitude = isset($row['latitude']) ? (float) $row['latitude'] : 0.0;
    $longitude = isset($row['longitude']) ? (float) $row['longitude'] : 0.0;

    return [
        'id' => (int) ($row['id'] ?? 0),
        'name' => (string) ($row['name'] ?? ''),
        'category' => (string) ($row['category'] ?? 'principal'),
        'section_name' => (string) ($row['section_name'] ?? 'Sin seccion'),
        'description' => (string) ($row['description'] ?? 'Descripcion pendiente.'),
        'address' => (string) ($row['address'] ?: (($row['name'] ?? '') !== '' ? $row['name'] . ', Valencia' : 'Direccion pendiente')),
        'neighborhood' => (string) ($row['neighborhood'] ?? ''),
        'latitude' => $latitude,
        'longitude' => $longitude,
        'image_url' => app_public_safe_image_url((string) ($row['image_url'] ?? '')),
        'prize_text' => (string) ($row['prize_text'] ?? 'Sin premio registrado'),
        'artist_name' => (string) ($row['artist_name'] ?? ''),
        'commission_name' => (string) ($row['commission_name'] ?? ''),
        'year' => (string) ($row['year'] ?? date('Y')),
        'favorites_count' => (int) ($row['favorites_count'] ?? 0),
        'events_count' => (int) ($row['events_count'] ?? 0),
        'status' => (string) ($row['status'] ?? ''),
        'detail_url' => './falla.php?id=' . (int) ($row['id'] ?? 0),
        'route_url' => app_public_route_url($latitude, $longitude, (string) ($row['address'] ?? ''), (string) ($row['name'] ?? '')),
        'apple_maps_url' => app_public_apple_maps_url($latitude, $longitude, (string) ($row['address'] ?? ''), (string) ($row['name'] ?? '')),
        'is_favorite' => in_array((int) ($row['id'] ?? 0), $favoriteIds, true),
    ];
}

function app_public_match_key(string $value): string
{
    $normalized = mb_strtolower(trim($value));
    $normalized = strtr($normalized, [
        'à' => 'a', 'á' => 'a', 'ä' => 'a', 'â' => 'a',
        'è' => 'e', 'é' => 'e', 'ë' => 'e', 'ê' => 'e',
        'ì' => 'i', 'í' => 'i', 'ï' => 'i', 'î' => 'i',
        'ò' => 'o', 'ó' => 'o', 'ö' => 'o', 'ô' => 'o',
        'ù' => 'u', 'ú' => 'u', 'ü' => 'u', 'û' => 'u',
        'ñ' => 'n', 'ç' => 'c', '·' => ' ', '.' => ' ', ',' => ' ',
    ]);

    return trim((string) preg_replace('/[^a-z0-9]+/', ' ', $normalized));
}

function app_public_infantil_coordinate_lookup(array $fallaRows): array
{
    $lookup = [];

    foreach ($fallaRows as $row) {
        $latitude = isset($row['latitude']) ? (float) $row['latitude'] : 0.0;
        $longitude = isset($row['longitude']) ? (float) $row['longitude'] : 0.0;

        if ($latitude === 0.0 || $longitude === 0.0) {
            continue;
        }

        foreach (['name', 'commission_name', 'address'] as $field) {
            $key = app_public_match_key((string) ($row[$field] ?? ''));

            if ($key !== '' && !isset($lookup[$key])) {
                $lookup[$key] = $row;
            }
        }
    }

    return $lookup;
}

function app_public_find_infantil_coordinate_row(array $row, array $coordinateLookup): ?array
{
    $name = (string) ($row['nombre'] ?? '');
    $keys = [app_public_match_key($name)];
    $firstSegment = trim((string) (explode('-', $name)[0] ?? ''));

    if ($firstSegment !== '') {
        $keys[] = app_public_match_key($firstSegment);
    }

    foreach (array_unique($keys) as $key) {
        if ($key !== '' && isset($coordinateLookup[$key])) {
            return $coordinateLookup[$key];
        }
    }

    return null;
}

function app_public_format_infantil_falla(array $row, array $coordinateLookup): array
{
    $coordinateRow = app_public_find_infantil_coordinate_row($row, $coordinateLookup);
    $latitude = isset($coordinateRow['latitude']) ? (float) $coordinateRow['latitude'] : 0.0;
    $longitude = isset($coordinateRow['longitude']) ? (float) $coordinateRow['longitude'] : 0.0;
    $name = trim((string) ($row['nombre'] ?? 'Falla infantil'));
    $section = trim((string) (($row['seccion_label'] ?? '') ?: ($row['seccion'] ?? 'Infantil')));
    $artist = trim((string) ($row['artista'] ?? ''));
    $year = trim((string) ($row['anio'] ?? date('Y')));
    $budget = isset($row['presupuesto_eur']) ? (float) $row['presupuesto_eur'] : (isset($row['presupuesto']) ? (float) $row['presupuesto'] : 0.0);
    $budgetLabel = trim((string) ($row['presupuesto_formateado'] ?? ''));
    $jcfNum = isset($row['jcf_num']) ? (int) $row['jcf_num'] : 0;
    $city = trim((string) ($row['ciudad'] ?? 'València'));
    $address = trim((string) ($coordinateRow['address'] ?? ''));
    $neighborhood = trim((string) ($coordinateRow['neighborhood'] ?? ''));
    $budgetCopy = $budgetLabel !== '' ? $budgetLabel : ($budget > 0 ? number_format($budget, 0, ',', '.') . ' EUR' : '');

    return [
        'id' => 'infantil-' . (int) ($row['id'] ?? 0),
        'jcf_num' => $jcfNum,
        'name' => $name,
        'slug' => (string) ($row['slug'] ?? ''),
        'category' => 'infantil',
        'section_name' => $section !== '' ? $section : 'Infantil',
        'description' => 'Falla infantil de la comisión ' . $name . '. ' . ($jcfNum > 0 ? 'Número JCF: ' . $jcfNum . '. ' : '') . ($artist !== '' ? 'Artista infantil: ' . $artist . '.' : 'Artista infantil pendiente.') . ($budgetCopy !== '' ? ' Presupuesto: ' . $budgetCopy . '.' : '') . ' Año ' . $year . '. Ciudad: ' . $city . '.',
        'address' => $address !== '' ? $address : $name . ', ' . $city,
        'neighborhood' => $neighborhood !== '' ? $neighborhood : $city,
        'latitude' => $latitude,
        'longitude' => $longitude,
        'image_url' => 'https://picsum.photos/seed/falla-infantil-' . (int) ($row['id'] ?? 0) . '/800/600',
        'prize_text' => 'Falla infantil',
        'artist_name' => $artist,
        'commission_name' => $name,
        'year' => $year,
        'city' => $city,
        'budget_eur' => $budget > 0 ? $budget : null,
        'budget_label' => $budgetCopy,
        'clasificacion' => (string) ($row['clasificacion'] ?? ''),
        'classification' => (string) ($row['clasificacion'] ?? ''),
        'duplicated_in_source' => (bool) ($row['duplicado_en_fuente'] ?? false),
        'favorites_count' => 0,
        'events_count' => 0,
        'status' => 'active',
        'detail_url' => '#',
        'route_url' => app_public_route_url($latitude, $longitude, $address, $name),
        'apple_maps_url' => app_public_apple_maps_url($latitude, $longitude, $address, $name),
        'is_favorite' => false,
    ];
}

function app_public_fetch_fallas(array $user): array
{
    $favoriteIds = app_public_favorite_ids($user, 'falla');
    $rows = dashboard_fetch_all(
        'SELECT fallas.id, fallas.name, fallas.category, fallas.section_name, fallas.description, fallas.address,
                fallas.neighborhood, fallas.latitude, fallas.longitude, fallas.image_url, fallas.prize_text,
                fallas.artist_name, fallas.commission_name, fallas.year, fallas.status,
                (SELECT COUNT(*) FROM favorites WHERE favorites.falla_id = fallas.id) AS favorites_count,
                (SELECT COUNT(*) FROM events WHERE events.falla_id = fallas.id AND events.status = :scheduled_status) AS events_count
         FROM fallas
         ORDER BY name ASC'
        ,
        ['scheduled_status' => 'scheduled']
    );

    $items = array_map(
        static fn (array $row): array => app_public_format_falla($row, $favoriteIds),
        $rows
    );

    try {
        $infantilRows = dashboard_fetch_all(
            "SELECT id, jcf_num, nombre, slug, artista, seccion, seccion_label, presupuesto, presupuesto_eur,
                    presupuesto_formateado, anio, tipo, ciudad, clasificacion, duplicado_en_fuente
              FROM fallas_infantiles
              WHERE tipo = :tipo
              ORDER BY nombre ASC",
            ['tipo' => 'infantil']
        );

        $coordinateLookup = app_public_infantil_coordinate_lookup($rows);

        foreach ($infantilRows as $infantilRow) {
            $items[] = app_public_format_infantil_falla($infantilRow, $coordinateLookup);
        }
    } catch (Throwable $exception) {
        // La tabla de infantiles es opcional; si no existe, mantenemos el catálogo principal intacto.
    }

    return $items;
}

function app_public_fetch_falla_detail(int $id, array $user): ?array
{
    $row = dashboard_fetch_row(
        'SELECT fallas.id, fallas.name, fallas.category, fallas.section_name, fallas.description, fallas.address,
                fallas.neighborhood, fallas.latitude, fallas.longitude, fallas.image_url, fallas.prize_text,
                fallas.artist_name, fallas.commission_name, fallas.year, fallas.status,
                (SELECT COUNT(*) FROM favorites WHERE favorites.falla_id = fallas.id) AS favorites_count,
                (SELECT COUNT(*) FROM events WHERE events.falla_id = fallas.id AND events.status = :scheduled_status) AS events_count
         FROM fallas
         WHERE id = :id
         LIMIT 1',
        [
            'id' => $id,
            'scheduled_status' => 'scheduled',
        ]
    );

    if ($row === null) {
        return null;
    }

    $favoriteIds = app_public_favorite_ids($user, 'falla');

    return app_public_format_falla($row, $favoriteIds);
}

function app_public_fetch_events(array $user): array
{
    $favoriteIds = app_public_favorite_ids($user, 'event');
    $rows = dashboard_fetch_all(
        'SELECT events.id, events.title, events.description, events.event_date, events.start_time, events.end_time,
                events.location_name, events.address, events.latitude, events.longitude, events.is_featured,
                event_categories.name AS category_name, event_categories.color AS category_color,
                fallas.name AS falla_name
         FROM events
         LEFT JOIN event_categories ON event_categories.id = events.category_id
         LEFT JOIN fallas ON fallas.id = events.falla_id
         WHERE events.status IN (:status, :published_status)
         ORDER BY events.event_date ASC, COALESCE(events.start_time, "00:00:00") ASC',
        ['status' => 'scheduled', 'published_status' => 'published']
    );

    return array_map(
        static function (array $row) use ($favoriteIds): array {
            $latitude = isset($row['latitude']) ? (float) $row['latitude'] : 0.0;
            $longitude = isset($row['longitude']) ? (float) $row['longitude'] : 0.0;

            return [
                'id' => (int) ($row['id'] ?? 0),
                'title' => (string) ($row['title'] ?? ''),
                'description' => (string) ($row['description'] ?? 'Evento sin descripcion.'),
                'category_name' => (string) ($row['category_name'] ?? 'Agenda'),
                'category_color' => (string) ($row['category_color'] ?? '#ff7a4d'),
                'event_date' => (string) ($row['event_date'] ?? ''),
                'start_time' => (string) ($row['start_time'] ?? ''),
                'end_time' => (string) ($row['end_time'] ?? ''),
                'location_name' => (string) ($row['location_name'] ?? 'Ubicacion pendiente'),
                'address' => (string) ($row['address'] ?? 'Direccion pendiente'),
                'latitude' => $latitude,
                'longitude' => $longitude,
                'falla_name' => (string) ($row['falla_name'] ?? ''),
                'is_featured' => (bool) ($row['is_featured'] ?? false),
                'is_favorite' => in_array((int) ($row['id'] ?? 0), $favoriteIds, true),
                'route_url' => app_public_route_url(
                    $latitude,
                    $longitude,
                    (string) ($row['address'] ?? ''),
                    (string) ($row['location_name'] ?? $row['title'] ?? '')
                ),
            ];
        },
        $rows
    );
}

function app_public_profile_preferences(): array
{
    $stored = $_SESSION['public_app_profile_preferences'] ?? null;

    if (!is_array($stored)) {
        $stored = [];
    }

    $location = trim((string) ($stored['location'] ?? ''));

    return [
        'location' => $location !== '' ? $location : 'Valencia',
    ];
}

function app_public_set_profile_preferences(array $preferences): void
{
    $location = trim((string) ($preferences['location'] ?? ''));

    $_SESSION['public_app_profile_preferences'] = [
        'location' => $location !== '' ? $location : 'Valencia',
    ];
}

function app_public_profile(array $user): array
{
    $userId = app_public_user_id($user);
    $name = (string) ($user['name'] ?? 'Invitado');
    $email = (string) ($user['email'] ?? '');
    $isGuest = app_public_is_guest($user);
    $role = (string) ($user['role'] ?? ($isGuest ? 'guest' : 'user'));
    $fallaFavorites = app_public_favorite_ids($user, 'falla');
    $eventFavorites = app_public_favorite_ids($user, 'event');
    $preferences = app_public_profile_preferences();

    return [
        'id' => $userId,
        'type' => $isGuest ? 'guest' : 'user',
        'name' => $name,
        'email' => $email,
        'username' => $email !== '' ? dashboard_username_from_email($email) : null,
        'location' => $preferences['location'],
        'role' => $role,
        'favorites' => [
            'fallas' => count($fallaFavorites),
            'events' => count($eventFavorites),
        ],
    ];
}

function app_public_update_profile(array $user, array $payload): array
{
    $payload = app_validate_payload_keys($payload, ['name', 'location'], true);
    $name = app_validate_string($payload['name'] ?? ($user['name'] ?? ''), 'name', [
        'min' => 1,
        'max' => 60,
        'normalize_spaces' => true,
        'pattern' => '/^[\p{L}\p{N}\s\.\'’\-_(),\/]+$/u',
    ]);
    $location = app_validate_string($payload['location'] ?? app_public_profile_preferences()['location'], 'location', [
        'min' => 1,
        'max' => 60,
        'normalize_spaces' => true,
        'pattern' => '/^[\p{L}\p{N}\s\.\'’\-_(),\/]+$/u',
    ]);

    app_public_set_profile_preferences([
        'location' => $location,
    ]);

    if (app_public_is_guest($user)) {
        $_SESSION['auth_user']['name'] = $name;

        return app_public_profile($_SESSION['auth_user']);
    }

    $userId = app_public_user_id($user);

    if ($userId === null) {
        throw new RuntimeException('No se pudo resolver la cuenta actual.');
    }

    $statement = db()->prepare(
        'UPDATE users
         SET name = :name
         WHERE id = :id'
    );
    $statement->execute([
        'name' => $name,
        'id' => $userId,
    ]);

    $_SESSION['auth_user']['name'] = $name;

    return app_public_profile($_SESSION['auth_user']);
}

function app_public_update_profile_name(array $user, string $name): array
{
    return app_public_update_profile($user, [
        'name' => $name,
    ]);
}
