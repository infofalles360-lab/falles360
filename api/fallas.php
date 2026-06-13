<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    app_require_method('GET');
    $user = api_authenticated_user_or_error();

    rate_limit_api_enforce('api_fallas', [
        ['scope' => 'user', 'max' => 30, 'window' => 60],
        ['scope' => 'session', 'max' => 30, 'window' => 60],
    ], app_rate_limit_context($user));

    $fallas = app_public_fetch_fallas($user);

    app_json_response([
        'ok' => true,
        'items' => $fallas,
        'count' => count($fallas),
    ]);
} catch (Throwable $exception) {
    app_json_error('No se pudieron cargar las fallas.', 500);
}

