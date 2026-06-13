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
    gamification_api_enforce_mutation_security('api_gamification_content_view', 30);
    $userId = gamification_api_registered_user_id();
    $payload = app_validate_payload_keys(app_request_json_payload(2048), ['fallaId', 'section'], true);
    $fallaId = app_validate_int($payload['fallaId'] ?? 0, 'fallaId', ['min' => 1]);
    $section = app_validate_string($payload['section'] ?? 'history', 'section', [
        'allow_empty' => true,
        'max' => 60,
        'normalize_spaces' => true,
    ]);

    gamification_api_respond([
        'ok' => true,
        ...gamification_track_content_view($userId, $fallaId, $section !== '' ? $section : 'history'),
    ]);
} catch (InvalidArgumentException $exception) {
    gamification_api_respond([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    gamification_api_respond([
        'ok' => false,
        'message' => 'No se pudo registrar la lectura de la ficha.',
    ], 500);
}
