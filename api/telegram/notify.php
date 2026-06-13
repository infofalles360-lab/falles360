<?php
declare(strict_types=1);

require_once __DIR__ . '/../../core/bootstrap.php';

try {
    app_require_method('POST');
    $user = api_authenticated_user_or_error();
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_telegram_notify', [
        ['scope' => 'user', 'max' => 10, 'window' => 60],
        ['scope' => 'session', 'max' => 10, 'window' => 60],
    ], app_rate_limit_context($user));

    if (!telegram_is_configured()) {
        app_json_error('El bot de Telegram no esta configurado todavia.', 503);
    }

    $userId = telegram_registered_user_id($user);

    if ($userId === null) {
        app_json_error('Necesitas una cuenta registrada para usar Telegram.', 403);
    }

    $payload = app_validate_payload_keys(app_request_json_payload(4096), ['message', 'userId'], true);
    $message = app_validate_string($payload['message'] ?? '', 'message', [
        'min' => 1,
        'max' => 1000,
        'normalize_spaces' => true,
    ]);

    $linkedUser = telegram_get_linked_user($userId);

    if ($linkedUser === null || empty($linkedUser['chatId'])) {
        app_json_error('Usuario no vinculado a Telegram.', 404);
    }

    telegram_send_message($linkedUser['chatId'], $message);

    app_json_response([
        'ok' => true,
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo enviar la notificacion a Telegram.', 500);
}
