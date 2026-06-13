<?php
declare(strict_types=1);

require_once __DIR__ . '/../../core/bootstrap.php';

try {
    app_require_method('GET');
    $user = api_authenticated_user_or_error();

    rate_limit_api_enforce('api_telegram_status', [
        ['scope' => 'user', 'max' => 20, 'window' => 60],
        ['scope' => 'session', 'max' => 20, 'window' => 60],
    ], app_rate_limit_context($user));

    $userId = telegram_registered_user_id($user);
    telegram_drain_updates();
    $status = telegram_status_for_user($userId);

    app_json_response([
        'ok' => true,
        'linked' => $status['linked'],
        'telegramUsername' => $status['telegramUsername'],
        'linkedAt' => $status['linkedAt'],
    ]);
} catch (Throwable $exception) {
    app_json_error('No se pudo comprobar el estado de Telegram.', 500);
}
