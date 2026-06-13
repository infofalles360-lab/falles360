<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    app_require_method('GET');
    $user = api_authenticated_user_or_error();

    rate_limit_api_enforce('api_events', [
        ['scope' => 'user', 'max' => 30, 'window' => 60],
        ['scope' => 'session', 'max' => 30, 'window' => 60],
    ], app_rate_limit_context($user));

    $events = app_public_fetch_events($user);

    app_json_response([
        'ok' => true,
        'items' => $events,
        'count' => count($events),
    ]);
} catch (Throwable $exception) {
    app_json_error('No se pudieron cargar los eventos.', 500);
}
