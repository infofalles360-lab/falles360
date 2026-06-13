<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $userId = gamification_api_registered_user_id();

    gamification_api_respond([
        'ok' => true,
        ...gamification_zone_progress($userId),
        'neighborhoods' => gamification_neighborhood_progress($userId),
    ]);
} catch (Throwable $exception) {
    gamification_api_respond([
        'ok' => false,
        'message' => 'No se pudo cargar el progreso por zonas.',
    ], 500);
}
