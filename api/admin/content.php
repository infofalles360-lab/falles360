<?php
declare(strict_types=1);

require_once __DIR__ . '/../../core/bootstrap.php';

function admin_content_table_has_column(string $table, string $column): bool
{
    static $cache = [];

    $key = strtolower($table . '.' . $column);
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    try {
        $statement = db()->prepare('SHOW COLUMNS FROM `' . $table . '` LIKE :column_name');
        $statement->execute(['column_name' => $column]);
        $cache[$key] = (bool) $statement->fetch();
    } catch (Throwable $exception) {
        $cache[$key] = false;
    }

    return $cache[$key];
}

function admin_content_update_falla(array $payload): array
{
    $id = app_validate_int($payload['id'] ?? null, 'id', ['min' => 1]);

    $fields = [
        'name' => app_validate_string($payload['name'] ?? '', 'name', ['min' => 1, 'max' => 255, 'normalize_spaces' => true]),
        'description' => app_validate_string($payload['description'] ?? '', 'description', ['min' => 1, 'max' => 5000]),
        'section_name' => app_validate_string($payload['section_name'] ?? '', 'section_name', ['min' => 1, 'max' => 120, 'normalize_spaces' => true]),
        'category' => app_validate_enum($payload['category'] ?? 'principal', 'category', ['principal', 'infantil', 'experimental']),
        'address' => app_validate_string($payload['address'] ?? '', 'address', ['allow_empty' => true, 'max' => 255, 'normalize_spaces' => true]),
        'neighborhood' => app_validate_string($payload['neighborhood'] ?? '', 'neighborhood', ['allow_empty' => true, 'max' => 120, 'normalize_spaces' => true]),
        'latitude' => app_validate_float($payload['latitude'] ?? 0, 'latitude', ['min' => -90, 'max' => 90]),
        'longitude' => app_validate_float($payload['longitude'] ?? 0, 'longitude', ['min' => -180, 'max' => 180]),
        'artist_name' => app_validate_string($payload['artist_name'] ?? '', 'artist_name', ['allow_empty' => true, 'max' => 190, 'normalize_spaces' => true]),
        'commission_name' => app_validate_string($payload['commission_name'] ?? '', 'commission_name', ['allow_empty' => true, 'max' => 190, 'normalize_spaces' => true]),
        'prize_text' => app_validate_string($payload['prize_text'] ?? '', 'prize_text', ['allow_empty' => true, 'max' => 190, 'normalize_spaces' => true]),
        'image_url' => app_validate_string($payload['image_url'] ?? '', 'image_url', ['allow_empty' => true, 'max' => 500]),
        'status' => app_validate_string($payload['status'] ?? 'active', 'status', ['allow_empty' => true, 'max' => 50, 'normalize_spaces' => true]),
        'year' => app_validate_string($payload['year'] ?? '', 'year', ['allow_empty' => true, 'max' => 20, 'normalize_spaces' => true]),
    ];

    $sets = [];
    $params = ['id' => $id];

    foreach ($fields as $field => $value) {
        if (!admin_content_table_has_column('fallas', $field)) {
            continue;
        }

        $sets[] = "`{$field}` = :{$field}";
        $params[$field] = $value;
    }

    if (admin_content_table_has_column('fallas', 'updated_at')) {
        $sets[] = '`updated_at` = CURRENT_TIMESTAMP';
    }

    if ($sets === []) {
        throw new RuntimeException('No hay campos editables disponibles.');
    }

    $statement = db()->prepare('UPDATE fallas SET ' . implode(', ', $sets) . ' WHERE id = :id LIMIT 1');
    $statement->execute($params);

    $updated = app_public_fetch_falla_detail($id, api_authenticated_user_or_error());
    if ($updated === null) {
        throw new RuntimeException('No se pudo leer la falla actualizada.');
    }

    return $updated;
}

try {
    app_require_method('POST');
    $user = api_admin_user_or_error();
    if (($user['role'] ?? '') !== 'admin') {
        app_json_error('No autorizado.', 403, 'error');
    }

    rate_limit_api_enforce('api_admin_content', [
        ['scope' => 'user', 'max' => 40, 'window' => 60],
        ['scope' => 'session', 'max' => 40, 'window' => 60],
    ], app_rate_limit_context($user));

    app_require_json_content_type();
    csrf_assert_valid();

    $payload = app_request_json_payload(32768);
    $type = app_validate_enum($payload['type'] ?? '', 'type', ['falla']);
    $data = app_validate_array($payload['data'] ?? null, 'data');

    if ($type === 'falla') {
        app_json_response([
            'ok' => true,
            'item' => admin_content_update_falla($data),
        ]);
    }

    app_json_error('Tipo no soportado.', 422);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo guardar el contenido.', 500);
}
