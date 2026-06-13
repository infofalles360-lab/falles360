<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../core/bootstrap.php';

try {
    app_require_method('POST');
    $user = api_admin_user_or_error();
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_admin_cendra_send_article', [
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

    $payload = app_validate_payload_keys(app_request_json_payload(4096), ['articleId'], true);
    $articleId = app_validate_int($payload['articleId'] ?? 0, 'articleId', ['min' => 1]);
    $article = $articleId > 0 ? cendra_find_article($articleId) : null;

    if (!is_array($article)) {
        app_json_error('No se ha encontrado el articulo de Cendra.', 404, 'error');
    }

    telegram_send_cendra_article_to_chat($linkedUser['chatId'], $article, [
        'action' => 'cendra_article',
        'articleId' => $articleId,
        'userId' => $userId,
    ]);
    write_access_log(
        $userId,
        'cendra_send_bot',
        'cendra_articles',
        $articleId,
        'Articulo de Cendra enviado al Telegram privado del admin con confirmacion para el canal.'
    );

    app_json_response([
        'ok' => true,
        'articleId' => $articleId,
        'title' => (string) ($article['title'] ?? ''),
        'chatId' => (string) ($linkedUser['chatId'] ?? ''),
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422, 'error');
} catch (Throwable $exception) {
    error_log('Cendra send article to me failed: ' . $exception->getMessage());
    app_json_error($exception->getMessage(), 500, 'error');
}
