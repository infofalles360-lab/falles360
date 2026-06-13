<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../core/bootstrap.php';

try {
    app_require_method('POST');
    $user = api_admin_user_or_error();
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_admin_cendra_landing', [
        ['scope' => 'user', 'max' => 30, 'window' => 60],
    ], app_rate_limit_context($user));

    $payload = app_validate_payload_keys(app_request_json_payload(4096), ['articleId', 'published'], true);
    $articleId = app_validate_int($payload['articleId'] ?? 0, 'articleId', ['min' => 1]);
    $published = (bool) ($payload['published'] ?? false);
    $article = cendra_find_article($articleId);

    if (!is_array($article)) {
        app_json_error('No se ha encontrado el articulo de Cendra.', 404, 'error');
    }

    cendra_set_article_landing_publication($articleId, $published);
    write_access_log(
        (int) ($user['id'] ?? 0),
        $published ? 'cendra_publish_landing' : 'cendra_unpublish_landing',
        'cendra_articles',
        $articleId,
        $published
            ? 'Articulo de Cendra publicado en noticias de la landing.'
            : 'Articulo de Cendra retirado de noticias de la landing.'
    );

    app_json_response([
        'ok' => true,
        'articleId' => $articleId,
        'title' => (string) ($article['title'] ?? ''),
        'landingPublished' => $published,
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422, 'error');
} catch (Throwable $exception) {
    error_log('Cendra landing publication failed: ' . $exception->getMessage());
    app_json_error($exception->getMessage(), 500, 'error');
}
