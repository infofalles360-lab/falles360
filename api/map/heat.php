<?php

declare(strict_types=1);

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../core/map_heat_repository.php';

try {
    app_require_method('GET');
    $user = api_authenticated_user_or_error();

    rate_limit_api_enforce('api_map_heat', [
        ['scope' => 'user', 'max' => 60, 'window' => 60],
        ['scope' => 'ip', 'max' => 60, 'window' => 60],
    ], app_rate_limit_context($user));

    $bbox = map_heat_parse_bbox(isset($_GET['bbox']) ? (string) $_GET['bbox'] : null);
    if ($bbox === null) {
        app_json_error('bbox no valido.', 422);
    }

    $zoom = isset($_GET['zoom']) ? app_validate_int($_GET['zoom'], 'zoom', ['min' => 10, 'max' => 18]) : 13;
    $range = isset($_GET['range']) ? app_validate_time_range($_GET['range']) : '1h';

    app_json_response([
        'ok' => true,
        ...map_heat_build_payload($bbox, $zoom, $range),
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo generar el mapa de calor.', 500);
}
