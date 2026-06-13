<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    app_require_method('GET');
    $user = api_authenticated_user_or_error();

    rate_limit_api_enforce('api_cendra_search', [
        ['scope' => 'user', 'max' => 20, 'window' => 60],
        ['scope' => 'ip', 'max' => 20, 'window' => 60],
    ], app_rate_limit_context($user));

    $query = isset($_GET['q']) ? app_validate_string($_GET['q'], 'q', [
        'allow_empty' => true,
        'max' => 120,
        'normalize_spaces' => true,
        'pattern' => '/^[\p{L}\p{N}\s\.\,\-_:\/]+$/u',
    ]) : '';
    $limit = isset($_GET['limit']) ? app_validate_int($_GET['limit'], 'limit', ['min' => 1, 'max' => 20]) : 12;
    $articles = cendra_search_articles($query !== '' ? $query : null, $limit);

    app_json_response([
        'ok' => true,
        'items' => array_map(static fn (array $article): array => cendra_format_article_search_result($article), $articles),
        'count' => count($articles),
        'query' => $query,
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudieron cargar los articulos de Cendra.', 500);
}
