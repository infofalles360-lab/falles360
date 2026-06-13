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
    gamification_api_enforce_mutation_security('api_gamification_visit', 30);
    $userId = gamification_api_registered_user_id();
    $payload = app_validate_payload_keys(app_request_json_payload(4096), ['fallaId', 'latitude', 'longitude', 'radiusMeters', 'visitSource'], true);
    $fallaId = app_validate_int($payload['fallaId'] ?? 0, 'fallaId', ['min' => 1]);
    $latitude = app_validate_coordinate($payload['latitude'] ?? 0, 'latitude', 'latitude');
    $longitude = app_validate_coordinate($payload['longitude'] ?? 0, 'longitude', 'longitude');
    $radiusMeters = isset($payload['radiusMeters'])
        ? app_validate_int($payload['radiusMeters'], 'radiusMeters', ['min' => 1, 'max' => 5000])
        : null;
    $visitSource = app_validate_string($payload['visitSource'] ?? 'gps', 'visitSource', [
        'allow_empty' => true,
        'max' => 40,
        'normalize_spaces' => true,
    ]);

    if ($latitude === 0.0 || $longitude === 0.0) {
        throw new InvalidArgumentException('Datos de visita no validos.');
    }

    gamification_api_respond([
        'ok' => true,
        ...gamification_register_visit($userId, $fallaId, $latitude, $longitude, $radiusMeters, $visitSource !== '' ? $visitSource : 'gps'),
    ]);
} catch (InvalidArgumentException $exception) {
    gamification_api_respond([
        'ok' => false,
        'message' => $exception->getMessage(),
    ], 422);
} catch (Throwable $exception) {
    gamification_api_respond([
        'ok' => false,
        'message' => 'No se pudo registrar la visita.',
    ], 500);
}
