<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/fallerito-memory-lib.php';

try {
    $user = api_registered_user_or_error('Necesitas una cuenta registrada para usar la memoria de Fallerito.');

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        app_json_response([
            'ok' => true,
            'memory' => fallerito_memory_get($user),
        ]);
    }

    app_require_method('POST');
    app_require_json_content_type();
    csrf_assert_valid();

    $payload = app_validate_payload_keys(app_request_json_payload(4096), [
        'language',
        'prefersWalking',
        'avoidsCrowds',
        'foodInterestLevel',
        'favoriteZones',
        'reset',
    ], true);

    $memory = fallerito_memory_patch($user, $payload);

    app_json_response([
        'ok' => true,
        'memory' => $memory,
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo cargar la memoria de Fallerito.', 500);
}
