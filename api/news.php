<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

function landing_news_item(array $article): array
{
    $landingTitle = trim((string) ($article['landing_title'] ?? ''));
    $landingExcerpt = trim((string) ($article['landing_excerpt'] ?? ''));

    return [
        'id' => (int) ($article['id'] ?? 0),
        'title' => $landingTitle !== '' ? $landingTitle : (string) ($article['title'] ?? ''),
        'excerpt' => $landingExcerpt !== '' ? cendra_truncate(cendra_plain_text($landingExcerpt), 240) : cendra_article_excerpt($article, 240),
        'url' => cendra_safe_public_url((string) ($article['url'] ?? '')) ?? '',
        'imageUrl' => cendra_article_image_url($article),
        'category' => (string) ($article['category'] ?? ''),
        'author' => (string) ($article['author'] ?? ''),
        'publishedAt' => $article['published_at'] ?? null,
        'landingPublishedAt' => $article['landing_published_at'] ?? null,
        'featured' => (bool) ($article['landing_featured'] ?? false),
    ];
}

try {
    app_require_method('GET');

    rate_limit_api_enforce('api_landing_news', [
        ['scope' => 'ip', 'max' => 60, 'window' => 60],
    ], app_rate_limit_context(null));

    if (isset($_GET['id'])) {
        $articleId = app_validate_int($_GET['id'], 'id', ['min' => 1]);
        $article = cendra_find_article($articleId);

        if (!is_array($article) || !(bool) ($article['landing_published'] ?? false)) {
            app_json_error('Noticia no encontrada.', 404);
        }

        app_json_response([
            'ok' => true,
            'item' => landing_news_item($article),
        ]);
    }

    $limit = isset($_GET['limit']) ? app_validate_int($_GET['limit'], 'limit', ['min' => 1, 'max' => 12]) : 6;
    $articles = cendra_landing_articles($limit);

    app_json_response([
        'ok' => true,
        'items' => array_map(static fn (array $article): array => landing_news_item($article), $articles),
        'count' => count($articles),
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    error_log('Landing news failed: ' . $exception->getMessage());
    app_json_error('No se pudieron cargar las noticias.', 500);
}
