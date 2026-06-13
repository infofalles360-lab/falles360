<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../core/bootstrap.php';

try {
    app_require_method('GET');
    $user = api_admin_user_or_error();

    rate_limit_api_enforce('api_admin_cendra_status', [
        ['scope' => 'user', 'max' => 20, 'window' => 60],
    ], app_rate_limit_context($user));

    $snapshot = cendra_sync_status_snapshot();
    $latestRun = is_array($snapshot['latest_run'] ?? null) ? $snapshot['latest_run'] : null;
    $recentArticles = is_array($snapshot['recent_articles'] ?? null) ? $snapshot['recent_articles'] : [];

    app_json_response([
        'ok' => true,
        'configured' => (bool) ($snapshot['configured'] ?? false),
        'sourceUrl' => $snapshot['source_url'] ?? null,
        'articlesTotal' => (int) ($snapshot['articles_total'] ?? 0),
        'pendingTelegramArticles' => (int) ($snapshot['pending_telegram_articles'] ?? 0),
        'landingArticles' => (int) ($snapshot['landing_articles'] ?? 0),
        'latestArticlePublishedAt' => $snapshot['latest_article_published_at'] ?? null,
        'latestRun' => $latestRun !== null ? [
            'id' => (int) ($latestRun['id'] ?? 0),
            'status' => (string) ($latestRun['status'] ?? ''),
            'startedAt' => $latestRun['started_at'] ?? null,
            'finishedAt' => $latestRun['finished_at'] ?? null,
            'newItems' => (int) ($latestRun['new_items'] ?? 0),
            'notes' => $latestRun['notes'] ?? null,
        ] : null,
        'recentArticles' => array_map(static function (array $article): array {
            return [
                'id' => (int) ($article['id'] ?? 0),
                'title' => (string) ($article['title'] ?? ''),
                'url' => cendra_safe_public_url((string) ($article['url'] ?? '')) ?? '',
                'publishedAt' => $article['published_at'] ?? null,
                'category' => (string) ($article['category'] ?? ''),
                'author' => (string) ($article['author'] ?? ''),
                'telegramSent' => (bool) ($article['telegram_sent'] ?? false),
                'landingPublished' => (bool) ($article['landing_published'] ?? false),
                'landingPublishedAt' => $article['landing_published_at'] ?? null,
                'landingTitle' => (string) ($article['landing_title'] ?? ''),
                'landingExcerpt' => (string) ($article['landing_excerpt'] ?? ''),
            ];
        }, $recentArticles),
    ]);
} catch (Throwable $exception) {
    error_log('Cendra status failed: ' . $exception->getMessage());
    app_json_error($exception->getMessage(), 500, 'error');
}
