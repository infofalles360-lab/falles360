<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    app_require_method(['GET', 'POST']);
    $user = api_authenticated_user_or_error();

    rate_limit_api_enforce('api_favorites', [
        ['scope' => 'user', 'max' => 30, 'window' => 60],
        ['scope' => 'session', 'max' => 30, 'window' => 60],
    ], app_rate_limit_context($user));

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        app_json_response([
            'ok' => true,
            'favorites' => [
                'fallas' => app_public_favorite_ids($user, 'falla'),
                'events' => app_public_favorite_ids($user, 'event'),
            ],
        ]);
    }

    app_require_json_content_type();
    csrf_assert_valid();
    $payload = app_validate_payload_keys(app_request_json_payload(4096), ['type', 'id'], true);
    $type = app_validate_enum($payload['type'] ?? 'falla', 'type', ['falla', 'event']);
    $id = app_validate_int($payload['id'] ?? 0, 'id', ['min' => 1]);

    $result = app_public_toggle_favorite($user, $type, $id);
    $gamification = null;
    $userId = gamification_registered_user_id($user);

    if ($userId !== null && $type === 'falla' && $result['favorite'] === true) {
        $gamification = gamification_track_favorite_added($userId, $id);
    }

    app_json_response([
        'ok' => true,
        'favorite' => $result['favorite'],
        'favorites' => $result['favorites'],
        'gamification' => $gamification,
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudieron actualizar los favoritos.', 500);
}
