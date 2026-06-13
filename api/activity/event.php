<?php

declare(strict_types=1);

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../core/map_heat_repository.php';

try {
    app_require_method('POST');
    app_require_json_content_type();
    $user = api_authenticated_user_or_error();
    csrf_assert_valid();

    rate_limit_api_enforce('api_activity_event', [
        ['scope' => 'session', 'max' => 20, 'window' => 60],
        ['scope' => 'ip', 'max' => 20, 'window' => 60],
    ], app_rate_limit_context($user));

    $payload = app_validate_payload_keys(app_request_json_payload(4096), [
        'falla_id',
        'event_type',
        'latitude',
        'longitude',
    ], true);

    $userId = isset($user['id']) ? (int) $user['id'] : 0;
    $fallaId = isset($payload['falla_id']) && $payload['falla_id'] !== null
        ? app_validate_int($payload['falla_id'], 'falla_id', ['min' => 1, 'max' => 2147483647])
        : 0;
    $eventType = app_validate_enum($payload['event_type'] ?? '', 'event_type', activity_event_allowed_types());
    $latitude = app_validate_coordinate($payload['latitude'] ?? null, 'latitude', 'latitude');
    $longitude = app_validate_coordinate($payload['longitude'] ?? null, 'longitude', 'longitude');

    if ($fallaId > 0) {
        $falla = dashboard_fetch_row(
            'SELECT id
             FROM fallas
             WHERE id = :id
             LIMIT 1',
            ['id' => $fallaId]
        );

        if ($falla === null) {
            security_log_event('activity_event_invalid_falla', [
                'falla_id' => $fallaId,
                'event_type' => $eventType,
            ], $userId > 0 ? $userId : null);

            throw new InvalidArgumentException('falla_id no valido.');
        }
    }

    activity_event_record(
        $userId > 0 ? $userId : null,
        $fallaId > 0 ? $fallaId : null,
        $eventType,
        $latitude,
        $longitude
    );

    app_json_response([
        'ok' => true,
    ]);
} catch (InvalidArgumentException $exception) {
    security_log_event('activity_event_rejected', [
        'reason' => $exception->getMessage(),
    ]);
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    security_log_event('activity_event_failed', [
        'error' => $exception->getMessage(),
    ]);
    app_json_error('No se pudo registrar el evento.', 500);
}
