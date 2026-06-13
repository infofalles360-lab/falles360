<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../core/bootstrap.php';

try {
    app_require_method('POST');
    $user = api_admin_user_or_error();
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_admin_cendra_send_daily_summary', [
        ['scope' => 'user', 'max' => 20, 'window' => 60],
    ], app_rate_limit_context($user));

    if (!telegram_is_configured()) {
        app_json_error('El bot de Telegram no esta configurado todavia.', 503, 'error');
    }

    $userId = (int) ($user['id'] ?? 0);
    $linkedUser = telegram_get_linked_user($userId);

    if (!is_array($linkedUser) || trim((string) ($linkedUser['chatId'] ?? '')) === '') {
        app_json_error('Tu cuenta admin no tiene Telegram vinculado todavia.', 409, 'error');
    }

    $payload = app_validate_payload_keys(app_request_json_payload(4096), ['date'], true);
    $requestedDateRaw = app_validate_date_ymd($payload['date'] ?? '', 'date') ?? '';
    $requestedDate = $requestedDateRaw !== '' ? new DateTimeImmutable($requestedDateRaw) : null;
    $summary = cendra_daily_summary_payload($requestedDate);
    telegram_send_cendra_summary_review_to_chat($linkedUser['chatId'], $summary, [
        'action' => 'cendra_daily_summary_publish_approved',
        'userId' => $userId,
        'query' => 'resumen diario',
        'articleIds' => array_values(array_filter(array_map(
            static fn (array $article): int => (int) ($article['id'] ?? 0),
            is_array($summary['articles'] ?? null) ? $summary['articles'] : []
        ))),
    ]);

    write_access_log(
        $userId,
        'cendra_daily_summary_telegram',
        'cendra_articles',
        null,
        'Resumen diario de Cendra enviado al bot del admin con confirmacion para el canal.'
    );

    app_json_response([
        'ok' => true,
        'chatId' => (string) ($linkedUser['chatId'] ?? ''),
        'summaryDate' => $summary['summary_date'] ?? null,
        'articleCount' => (int) ($summary['article_count'] ?? 0),
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422, 'error');
} catch (Throwable $exception) {
    error_log('Cendra daily summary telegram send failed: ' . $exception->getMessage());
    app_json_error($exception->getMessage(), 500, 'error');
}
