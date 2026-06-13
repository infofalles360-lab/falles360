<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $userId = gamification_api_registered_user_id();
    $limit = isset($_GET['limit'])
        ? app_validate_int($_GET['limit'], 'limit', ['min' => 1, 'max' => 30])
        : 12;

    gamification_api_respond([
        'ok' => true,
        'items' => gamification_recent_activity($userId, $limit),
    ]);
} catch (Throwable $exception) {
    gamification_api_respond([
        'ok' => false,
        'message' => 'No se pudo cargar la actividad reciente.',
    ], 500);
}
