<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $userId = gamification_api_registered_user_id();

    gamification_api_respond([
        'ok' => true,
        ...gamification_stats_bundle($userId),
    ]);
} catch (Throwable $exception) {
    gamification_api_respond([
        'ok' => false,
        'message' => 'No se pudieron cargar las estadísticas gamificadas.',
    ], 500);
}
