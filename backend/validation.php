<?php
declare(strict_types=1);

function app_validation_error(string $message): never
{
    throw new InvalidArgumentException($message);
}

function app_validate_array(mixed $value, string $field): array
{
    if (!is_array($value)) {
        app_validation_error("{$field} no valido.");
    }

    return $value;
}

function app_validate_payload_keys(array $payload, array $allowedKeys, bool $rejectUnknown = false): array
{
    $allowedLookup = array_fill_keys($allowedKeys, true);

    if ($rejectUnknown) {
        foreach (array_keys($payload) as $key) {
            if (!isset($allowedLookup[(string) $key])) {
                app_validation_error('El payload contiene campos no permitidos.');
            }
        }
    }

    return $payload;
}

function app_validate_string(mixed $value, string $field, array $options = []): string
{
    if (is_array($value) || is_object($value)) {
        app_validation_error("{$field} no valido.");
    }

    $string = (string) app_sanitize_input_value((string) ($value ?? ''), [
        'trim' => false,
    ]);

    if (($options['trim'] ?? true) === true) {
        $string = trim($string);
    }

    if (($options['normalize_spaces'] ?? false) === true) {
        $string = preg_replace('/\s+/u', ' ', $string) ?? $string;
    }

    $allowEmpty = (bool) ($options['allow_empty'] ?? false);
    if (!$allowEmpty && $string === '') {
        app_validation_error("{$field} no valido.");
    }

    $length = mb_strlen($string);
    $min = isset($options['min']) ? (int) $options['min'] : null;
    $max = isset($options['max']) ? (int) $options['max'] : null;

    if ($min !== null && $length < $min) {
        app_validation_error("{$field} no valido.");
    }

    if ($max !== null && $length > $max) {
        app_validation_error("{$field} no valido.");
    }

    $pattern = $options['pattern'] ?? null;
    if (is_string($pattern) && $string !== '' && preg_match($pattern, $string) !== 1) {
        app_validation_error("{$field} no valido.");
    }

    return $string;
}

function app_validate_email(mixed $value, string $field = 'email'): string
{
    $email = mb_strtolower(app_validate_string($value, $field, [
        'max' => 190,
    ]));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        app_validation_error("{$field} no valido.");
    }

    return $email;
}

function app_validate_int(mixed $value, string $field, array $options = []): int
{
    if (is_bool($value) || is_array($value) || is_object($value) || $value === '' || $value === null) {
        app_validation_error("{$field} no valido.");
    }

    $intValue = filter_var($value, FILTER_VALIDATE_INT);

    if ($intValue === false) {
        app_validation_error("{$field} no valido.");
    }

    $min = isset($options['min']) ? (int) $options['min'] : null;
    $max = isset($options['max']) ? (int) $options['max'] : null;

    if ($min !== null && $intValue < $min) {
        app_validation_error("{$field} no valido.");
    }

    if ($max !== null && $intValue > $max) {
        app_validation_error("{$field} no valido.");
    }

    return (int) $intValue;
}

function app_validate_float(mixed $value, string $field, array $options = []): float
{
    if (is_bool($value) || is_array($value) || is_object($value) || $value === '' || $value === null) {
        app_validation_error("{$field} no valido.");
    }

    $floatValue = filter_var($value, FILTER_VALIDATE_FLOAT);

    if ($floatValue === false || !is_finite((float) $floatValue)) {
        app_validation_error("{$field} no valido.");
    }

    $floatValue = (float) $floatValue;
    $min = isset($options['min']) ? (float) $options['min'] : null;
    $max = isset($options['max']) ? (float) $options['max'] : null;

    if ($min !== null && $floatValue < $min) {
        app_validation_error("{$field} no valido.");
    }

    if ($max !== null && $floatValue > $max) {
        app_validation_error("{$field} no valido.");
    }

    return $floatValue;
}

function app_validate_enum(mixed $value, string $field, array $allowed): string
{
    $normalized = app_validate_string($value, $field, [
        'max' => 100,
    ]);

    if (!in_array($normalized, $allowed, true)) {
        app_validation_error("{$field} no valido.");
    }

    return $normalized;
}

function app_validate_coordinate(mixed $value, string $field, string $axis): float
{
    $range = $axis === 'longitude'
        ? ['min' => -180.0, 'max' => 180.0]
        : ['min' => -90.0, 'max' => 90.0];

    return app_validate_float($value, $field, $range);
}

function app_validate_bbox(?string $rawBbox, string $field = 'bbox'): array
{
    $bbox = app_validate_string($rawBbox, $field, [
        'max' => 120,
    ]);
    $parts = array_map('trim', explode(',', $bbox));

    if (count($parts) !== 4) {
        app_validation_error("{$field} no valido.");
    }

    $south = app_validate_coordinate($parts[0], $field, 'latitude');
    $west = app_validate_coordinate($parts[1], $field, 'longitude');
    $north = app_validate_coordinate($parts[2], $field, 'latitude');
    $east = app_validate_coordinate($parts[3], $field, 'longitude');

    if ($south > $north) {
        [$south, $north] = [$north, $south];
    }

    if ($west > $east) {
        [$west, $east] = [$east, $west];
    }

    return [
        'south' => $south,
        'west' => $west,
        'north' => $north,
        'east' => $east,
    ];
}

function app_validate_time_range(mixed $value, string $field = 'range', ?array $allowedValues = null): string
{
    $allowed = $allowedValues ?? ['15m', '30m', '1h', '6h', '12h', '24h'];

    return app_validate_enum($value, $field, $allowed);
}

function app_validate_date_ymd(mixed $value, string $field): ?string
{
    $raw = app_validate_string($value, $field, [
        'allow_empty' => true,
        'max' => 10,
    ]);

    if ($raw === '') {
        return null;
    }

    $date = DateTimeImmutable::createFromFormat('Y-m-d', $raw);
    $errors = DateTimeImmutable::getLastErrors();

    if (!$date instanceof DateTimeImmutable || ($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0) {
        app_validation_error("{$field} no valido.");
    }

    return $date->format('Y-m-d');
}

function app_validate_url(mixed $value, string $field, array $allowedSchemes = ['https']): string
{
    $url = app_validate_string($value, $field, [
        'max' => 2048,
    ]);

    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        app_validation_error("{$field} no valido.");
    }

    $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

    if (!in_array($scheme, $allowedSchemes, true)) {
        app_validation_error("{$field} no valido.");
    }

    return $url;
}

function app_validate_ip_address(mixed $value, string $field, int $flags = FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6): string
{
    $ip = app_validate_string($value, $field, [
        'max' => 45,
    ]);

    if (!filter_var($ip, FILTER_VALIDATE_IP, $flags)) {
        app_validation_error("{$field} no valido.");
    }

    return $ip;
}

function app_validate_slug(mixed $value, string $field, array $options = []): string
{
    $default_pattern = ($options['pattern'] ?? '/^[a-z0-9\-_]+$/i');
    return app_validate_string($value, $field, array_merge([
        'pattern' => $default_pattern,
        'max' => 100,
    ], $options));
}

function app_validate_uuid(mixed $value, string $field): string
{
    $uuid = app_validate_string($value, $field, [
        'max' => 36,
    ]);

    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $uuid)) {
        app_validation_error("{$field} no valido.");
    }

    return $uuid;
}

function app_validate_boolean(mixed $value, string $field): bool
{
    if (is_bool($value)) {
        return $value;
    }

    $stringValue = (string) $value;

    if (in_array(strtolower($stringValue), ['true', '1', 'yes', 'on'], true)) {
        return true;
    }

    if (in_array(strtolower($stringValue), ['false', '0', 'no', 'off'], true)) {
        return false;
    }

    app_validation_error("{$field} no valido.");
}

function app_validate_iso8601_datetime(mixed $value, string $field): string
{
    $dateStr = app_validate_string($value, $field, [
        'max' => 30,
    ]);

    try {
        $date = new DateTimeImmutable($dateStr);
        return $date->format(DateTimeInterface::ATOM);
    } catch (Exception $exception) {
        app_validation_error("{$field} no valido.");
    }
}
