<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../core/bootstrap.php';

try {
    app_require_method('POST');
    $user = api_admin_user_or_error();
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_admin_telegram_send', [
        ['scope' => 'user', 'max' => 20, 'window' => 60],
    ], app_rate_limit_context($user));

    if (!telegram_is_configured()) {
        app_json_error('El bot de Telegram no esta configurado todavia.', 503, 'error');
    }

    $payload = app_validate_payload_keys(app_request_json_payload(16384), [
        'type',
        'title',
        'detail',
        'location',
        'footer',
        'target',
    ], true);
    $type = app_validate_enum($payload['type'] ?? '', 'type', ['aviso', 'novedad', 'ruta']);
    $title = app_validate_string($payload['title'] ?? '', 'title', ['min' => 1, 'max' => 140, 'normalize_spaces' => true]);
    $target = app_validate_enum($payload['target'] ?? '', 'target', ['channel', 'users', 'both']);
    $detail = app_validate_string($payload['detail'] ?? '', 'detail', ['allow_empty' => true, 'max' => 2000, 'normalize_spaces' => true]);
    $location = app_validate_string($payload['location'] ?? '', 'location', ['allow_empty' => true, 'max' => 160, 'normalize_spaces' => true]);
    $footer = app_validate_string($payload['footer'] ?? '', 'footer', ['allow_empty' => true, 'max' => 160, 'normalize_spaces' => true]);
    $publicAppUrl = telegram_public_app_url_for_messages();

    $sentChannel = false;
    $sentUsers = 0;

    if ($target === 'channel' || $target === 'both') {
        telegram_send_channel_post([
            'type' => $type,
            'title' => $title,
            'detail' => $detail,
            'location' => $location,
            'footer' => $footer,
            'buttonText' => $publicAppUrl !== null ? 'Abrir app' : null,
            'buttonUrl' => $publicAppUrl,
        ]);

        $sentChannel = true;
    }

    if ($target === 'users' || $target === 'both') {
        foreach (telegram_linked_users() as $linkedUser) {
            try {
                telegram_send_direct_alert($linkedUser['chatId'], [
                    'type' => $type,
                    'title' => $title,
                    'detail' => $detail,
                    'location' => $location,
                    'footer' => $footer,
                ]);
                $sentUsers++;
            } catch (Throwable $exception) {
                error_log('Telegram direct alert failed for chat ' . (string) $linkedUser['chatId'] . ': ' . $exception->getMessage());
            }
        }
    }

    app_json_response([
        'ok' => true,
        'sent' => [
            'channel' => $sentChannel,
            'users' => $sentUsers,
        ],
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422, 'error');
} catch (Throwable $exception) {
    error_log('Telegram admin send failed: ' . $exception->getMessage());
    app_json_error($exception->getMessage(), 500, 'error');
}
