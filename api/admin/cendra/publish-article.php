<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../core/bootstrap.php';

try {
    app_require_method('POST');
    $user = api_admin_user_or_error();
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_admin_cendra_publish_article', [
        ['scope' => 'user', 'max' => 20, 'window' => 60],
    ], app_rate_limit_context($user));

    if (!telegram_is_configured()) {
        app_json_error('El bot de Telegram no esta configurado todavia.', 503, 'error');
    }

    $payload = app_validate_payload_keys(app_request_json_payload(4096), ['articleId'], true);
    $articleId = app_validate_int($payload['articleId'] ?? 0, 'articleId', ['min' => 1]);
    $article = $articleId > 0 ? cendra_find_article($articleId) : null;

    if (!is_array($article)) {
        app_json_error('No se ha encontrado el articulo de Cendra.', 404, 'error');
    }

    telegram_send_cendra_channel_post($article);
    cendra_mark_article_telegram_sent($articleId);
    write_access_log(
        (int) ($user['id'] ?? 0),
        'cendra_publish_channel',
        'cendra_articles',
        $articleId,
        'Articulo de Cendra publicado en el canal de Telegram.'
    );

    app_json_response([
        'ok' => true,
        'articleId' => $articleId,
        'title' => (string) ($article['title'] ?? ''),
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422, 'error');
} catch (Throwable $exception) {
    error_log('Cendra publish article failed: ' . $exception->getMessage());
    app_json_error($exception->getMessage(), 500, 'error');
}
