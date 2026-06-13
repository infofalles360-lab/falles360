<?php
declare(strict_types=1);

require_once __DIR__ . '/../../core/bootstrap.php';

try {
    app_require_method('POST');
    app_require_json_content_type();

    rate_limit_api_enforce('api_telegram_webhook', [
        ['scope' => 'ip', 'max' => 60, 'window' => 60],
    ], app_rate_limit_context(null));

    if (!telegram_is_configured()) {
        app_json_error('El bot de Telegram no esta configurado todavia.', 503);
    }

    $configuredSecret = trim((string) (getenv('TELEGRAM_WEBHOOK_SECRET') ?: ''));
    $providedSecret = trim((string) ($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? ''));

    if ($configuredSecret !== '' && !hash_equals($configuredSecret, $providedSecret)) {
        security_log_event('telegram_webhook_secret_mismatch', []);
        app_json_error('Webhook no autorizado.', 403);
    }

    $payload = app_request_json_payload(262144);

    if (!is_array($payload) || $payload === []) {
        app_json_error('Update de Telegram no valido.', 400);
    }

    telegram_handle_update($payload);
    telegram_mark_payload_update_as_processed($payload);

    app_json_response([
        'ok' => true,
    ]);
} catch (InvalidArgumentException $exception) {
    security_log_event('telegram_webhook_rejected', [
        'reason' => $exception->getMessage(),
    ]);
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo procesar el webhook de Telegram.', 500);
}
