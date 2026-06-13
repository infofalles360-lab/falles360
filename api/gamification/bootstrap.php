<?php
declare(strict_types=1);

require_once __DIR__ . '/../../core/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

function gamification_api_respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo app_json_encode($payload);
    exit;
}

function gamification_api_current_user(): array
{
    if (!is_authenticated()) {
        gamification_api_respond([
            'ok' => false,
            'message' => 'Sesion no valida.',
        ], 401);
    }

    return current_user() ?? [];
}

function gamification_api_registered_user_id(): int
{
    $userId = gamification_registered_user_id(gamification_api_current_user());

    if ($userId === null) {
        gamification_api_respond([
            'ok' => false,
            'message' => 'Necesitas una cuenta registrada para usar la gamificación.',
        ], 403);
    }

    return $userId;
}

function gamification_api_enforce_mutation_security(string $action, int $maxPerMinute = 30): array
{
    app_require_json_content_type();
    csrf_assert_valid();
    $user = gamification_api_current_user();

    rate_limit_api_enforce($action, [
        ['scope' => 'user', 'max' => $maxPerMinute, 'window' => 60],
        ['scope' => 'session', 'max' => $maxPerMinute, 'window' => 60],
    ], app_rate_limit_context($user));

    return $user;
}
