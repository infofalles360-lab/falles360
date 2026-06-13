<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    app_require_method(['GET', 'POST']);
    $user = api_authenticated_user_or_error();

    rate_limit_api_enforce('api_profile', [
        ['scope' => 'user', 'max' => 30, 'window' => 60],
        ['scope' => 'session', 'max' => 30, 'window' => 60],
    ], app_rate_limit_context($user));

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        app_require_json_content_type();
        csrf_assert_valid();
        $payload = app_request_json_payload(8192);
        $profile = app_public_update_profile($user, $payload);

        app_json_response([
            'ok' => true,
            'profile' => $profile,
        ]);
    }

    app_json_response([
        'ok' => true,
        'profile' => app_public_profile($user),
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo procesar el perfil.', 500);
}
