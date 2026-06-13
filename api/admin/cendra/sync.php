<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../core/bootstrap.php';

try {
    app_require_method('POST');
    $user = api_admin_user_or_error();
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_admin_cendra_sync', [
        ['scope' => 'user', 'max' => 20, 'window' => 60],
    ], app_rate_limit_context($user));

    $payload = app_validate_payload_keys(app_request_json_payload(8192), ['sourceUrl', 'limit'], true);
    $sourceUrl = isset($payload['sourceUrl']) && trim((string) $payload['sourceUrl']) !== ''
        ? app_validate_url($payload['sourceUrl'], 'sourceUrl', ['https'])
        : '';
    $limit = isset($payload['limit']) ? app_validate_int($payload['limit'], 'limit', ['min' => 1, 'max' => 40]) : null;

    $result = cendra_sync_articles($sourceUrl !== '' ? $sourceUrl : null, $limit);
    write_access_log(
        (int) ($user['id'] ?? 0),
        'cendra_sync',
        'cendra_articles',
        null,
        sprintf(
            'Cendra sincronizado. Nuevos: %d. Actualizados: %d.',
            (int) ($result['new_items'] ?? 0),
            (int) ($result['updated_items'] ?? 0)
        )
    );

    $snapshot = cendra_sync_status_snapshot();
    $latestRun = is_array($snapshot['latest_run'] ?? null) ? $snapshot['latest_run'] : null;

    app_json_response([
        'ok' => true,
        'runId' => (int) ($result['run_id'] ?? 0),
        'sourceUrl' => (string) ($result['source_url'] ?? cendra_source_url()),
        'processedItems' => (int) ($result['processed_items'] ?? 0),
        'newItems' => (int) ($result['new_items'] ?? 0),
        'updatedItems' => (int) ($result['updated_items'] ?? 0),
        'latestRun' => $latestRun !== null ? [
            'id' => (int) ($latestRun['id'] ?? 0),
            'status' => (string) ($latestRun['status'] ?? ''),
            'startedAt' => $latestRun['started_at'] ?? null,
            'finishedAt' => $latestRun['finished_at'] ?? null,
            'newItems' => (int) ($latestRun['new_items'] ?? 0),
            'notes' => $latestRun['notes'] ?? null,
        ] : null,
        'articlesTotal' => (int) ($snapshot['articles_total'] ?? 0),
        'pendingTelegramArticles' => (int) ($snapshot['pending_telegram_articles'] ?? 0),
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422, 'error');
} catch (Throwable $exception) {
    error_log('Cendra sync failed: ' . $exception->getMessage());
    app_json_error($exception->getMessage(), 500, 'error');
}
