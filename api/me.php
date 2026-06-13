<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    app_require_method('GET');
    $user = api_authenticated_user_or_error();
    $email = trim((string) ($user['email'] ?? ''));

    app_json_response([
        'ok' => true,
        'user' => [
            'id' => (int) ($user['id'] ?? 0),
            'username' => $email !== '' ? dashboard_username_from_email($email) : null,
            'role' => (string) ($user['role'] ?? 'guest'),
        ],
    ]);
} catch (Throwable $exception) {
    app_json_error('Sesion no valida.', 401, 'error');
}
