<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../core/bootstrap.php';

try {
    app_require_method('POST');
    $user = api_admin_user_or_error();
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_admin_cendra_daily_summary', [
        ['scope' => 'user', 'max' => 20, 'window' => 60],
    ], app_rate_limit_context($user));

    $payload = app_validate_payload_keys(app_request_json_payload(4096), ['date'], true);
    $requestedDateRaw = app_validate_date_ymd($payload['date'] ?? '', 'date') ?? '';
    $requestedDate = $requestedDateRaw !== '' ? new DateTimeImmutable($requestedDateRaw) : null;
    $summary = cendra_daily_summary_payload($requestedDate);

    app_json_response([
        'ok' => true,
        'draft' => [
            'type' => (string) ($summary['type'] ?? 'novedad'),
            'title' => (string) ($summary['title'] ?? ''),
            'detail' => (string) ($summary['detail'] ?? ''),
            'location' => (string) ($summary['location'] ?? ''),
            'footer' => (string) ($summary['footer'] ?? ''),
            'target' => (string) ($summary['target'] ?? 'channel'),
        ],
        'summaryDate' => $summary['summary_date'] ?? null,
        'mode' => $summary['mode'] ?? null,
        'articleCount' => (int) ($summary['article_count'] ?? 0),
        'articles' => $summary['articles'] ?? [],
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422, 'error');
} catch (Throwable $exception) {
    error_log('Cendra daily summary failed: ' . $exception->getMessage());
    app_json_error($exception->getMessage(), 500, 'error');
}
