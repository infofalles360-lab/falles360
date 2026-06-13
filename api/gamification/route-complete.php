<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gamification_api_respond([
        'ok' => false,
        'message' => 'Metodo no permitido.',
    ], 405);
}

try {
    gamification_api_enforce_mutation_security('api_gamification_route_complete', 30);
    $userId = gamification_api_registered_user_id();

    gamification_api_respond([
        'ok' => true,
        ...gamification_mark_routes_completed($userId),
    ]);
} catch (Throwable $exception) {
    gamification_api_respond([
        'ok' => false,
        'message' => 'No se pudo recalcular el progreso de rutas.',
    ], 500);
}
