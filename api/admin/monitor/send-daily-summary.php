<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../core/bootstrap.php';
require_once __DIR__ . '/../../../backend/monitor/summary_lib.php';

try {
    app_require_method('POST');
    $user = api_admin_user_or_error();
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_admin_monitor_send_daily_summary', [
        ['scope' => 'user', 'max' => 10, 'window' => 60],
    ], app_rate_limit_context($user));

    if (!telegram_is_configured()) {
        app_json_error('El bot de Telegram no esta configurado todavia.', 503, 'error');
    }

    $userId = (int) ($user['id'] ?? 0);
    $linkedUser = telegram_get_linked_user($userId);

    if (!is_array($linkedUser) || trim((string) ($linkedUser['chatId'] ?? '')) === '') {
        app_json_error('Tu cuenta admin no tiene Telegram vinculado todavia.', 409, 'error');
    }

    $updates = monitor_fetch_daily_updates();
    telegram_send_message($linkedUser['chatId'], monitor_daily_summary_message($updates), [
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => false,
    ], 20);
    monitor_mark_daily_summary_sent($updates);

    write_access_log(
        $userId,
        'monitor_daily_summary_telegram',
        'detected_updates',
        null,
        'Resumen diario del monitor enviado al bot del admin.'
    );

    app_json_response([
        'ok' => true,
        'chatId' => (string) ($linkedUser['chatId'] ?? ''),
        'updateCount' => count($updates),
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422, 'error');
} catch (Throwable $exception) {
    error_log('Monitor daily summary telegram send failed: ' . $exception->getMessage());
    app_json_error($exception->getMessage(), 500, 'error');
}
