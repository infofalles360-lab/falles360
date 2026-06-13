<?php
declare(strict_types=1);

require_once __DIR__ . '/../../core/bootstrap.php';

try {
    app_require_method('POST');
    $user = api_authenticated_user_or_error();
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_telegram_link_token', [
        ['scope' => 'user', 'max' => 10, 'window' => 60],
        ['scope' => 'session', 'max' => 10, 'window' => 60],
    ], app_rate_limit_context($user));

    app_validate_payload_keys(app_request_json_payload(2048), ['userId'], true);

    if (!telegram_is_configured()) {
        app_json_error('El bot de Telegram no esta configurado todavia.', 503);
    }

    $userId = telegram_registered_user_id($user);
    $botUsername = telegram_bot_username();

    if ($userId === null) {
        app_json_error('Necesitas una cuenta registrada para vincular Telegram.', 403);
    }

    if ($botUsername === null) {
        app_json_error('Falta TELEGRAM_BOT_USERNAME en el entorno del servidor.', 500);
    }

    telegram_try_sync_bot_configuration();

    $token = telegram_generate_link_token();
    telegram_create_pending_link($userId, $token);

    app_json_response([
        'ok' => true,
        'telegramUrl' => 'https://t.me/' . $botUsername . '?start=link_' . $token,
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo generar el enlace de Telegram.', 500);
}
