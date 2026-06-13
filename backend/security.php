<?php
declare(strict_types=1);

function app_is_cli(): bool
{
    return PHP_SAPI === 'cli' || PHP_SAPI === 'phpdbg';
}

function app_is_https_request(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }

    $forwardedProto = strtolower(trim((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')));

    return $forwardedProto === 'https';
}

function app_request_host(): string
{
    return trim((string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
}

function app_security_json_flags(): int
{
    return JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_HEX_TAG
        | JSON_HEX_AMP
        | JSON_HEX_APOS
        | JSON_HEX_QUOT;
}

function app_json_encode(mixed $payload, int $flags = 0): string
{
    $json = json_encode($payload, app_security_json_flags() | $flags);

    if (!is_string($json)) {
        throw new RuntimeException('No se pudo serializar la respuesta JSON.');
    }

    return $json;
}

function app_sanitize_input_value(mixed $value, array $options = []): mixed
{
    if (is_array($value)) {
        $sanitized = [];

        foreach ($value as $key => $item) {
            $sanitizedKey = is_string($key)
                ? (string) app_sanitize_input_value($key, ['trim' => true])
                : $key;
            $sanitized[$sanitizedKey] = app_sanitize_input_value($item, $options);
        }

        return $sanitized;
    }

    if (!is_string($value)) {
        return $value;
    }

    $string = str_replace("\0", '', $value);
    $string = str_replace(["\r\n", "\r"], "\n", $string);
    $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $string);
    if (!is_string($cleaned)) {
        $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $string);
    }

    $string = is_string($cleaned) ? $cleaned : '';

    if (($options['trim'] ?? true) === true) {
        $string = trim($string);
    }

    $maxBytes = isset($options['max_bytes']) ? (int) $options['max_bytes'] : null;
    if ($maxBytes !== null && $maxBytes >= 0 && strlen($string) > $maxBytes) {
        $string = substr($string, 0, $maxBytes);
    }

    return $string;
}

function app_sanitize_input_array(array $payload, array $options = []): array
{
    return app_sanitize_input_value($payload, $options);
}

function app_csp_nonce(): string
{
    static $nonce;

    if (is_string($nonce)) {
        return $nonce;
    }

    $nonce = rtrim(strtr(base64_encode(random_bytes(18)), '+/', '-_'), '=');

    return $nonce;
}

function app_csp_nonce_attr(): string
{
    return ' nonce="' . htmlspecialchars(app_csp_nonce(), ENT_QUOTES, 'UTF-8') . '"';
}

function app_security_csp_header(): string
{
    $nonce = app_csp_nonce();
    $directives = [
        "default-src 'self'",
        "script-src 'self' 'nonce-{$nonce}' https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://unpkg.com",
        "img-src 'self' data: https:",
        "font-src 'self' data: https:",
        "connect-src 'self'",
        "media-src 'self' https: data:",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
    ];

    if (app_is_https_request()) {
        $directives[] = 'upgrade-insecure-requests';
    }

    return implode('; ', $directives);
}

function app_apply_security_headers(): void
{
    if (app_is_cli() || headers_sent()) {
        return;
    }

    header_remove('X-Powered-By');
    @ini_set('expose_php', '0');

    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header("Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=(), fullscreen=(self)");
    header('Content-Security-Policy: ' . app_security_csp_header());
    
    // HSTS (HTTP Strict-Transport-Security)
    if (app_is_https_request()) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
    }
}

function app_request_endpoint(): string
{
    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    $scriptName = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
    $endpoint = is_string($path) && $path !== '' ? $path : $scriptName;

    return $endpoint !== '' ? $endpoint : '/';
}

function app_request_content_type(): string
{
    $contentType = trim((string) ($_SERVER['CONTENT_TYPE'] ?? ($_SERVER['HTTP_CONTENT_TYPE'] ?? '')));

    if ($contentType === '') {
        return '';
    }

    $parts = explode(';', $contentType, 2);

    return strtolower(trim($parts[0]));
}

function app_request_body(int $maxBytes = 32768): string
{
    $raw = (string) file_get_contents('php://input');

    if (strlen($raw) > $maxBytes) {
        throw new InvalidArgumentException('La peticion excede el tamano permitido.');
    }

    return $raw;
}

function app_request_json_payload(int $maxBytes = 32768): array
{
    $raw = app_request_body($maxBytes);

    if ($raw === '') {
        return [];
    }

    try {
        $decoded = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        throw new InvalidArgumentException('El payload JSON no es valido.', 0, $exception);
    }

    if (!is_array($decoded)) {
        throw new InvalidArgumentException('El payload debe ser un objeto JSON.');
    }

    return app_sanitize_input_array($decoded);
}

function app_json_response(array $payload, int $status = 200): never
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }

    echo app_json_encode($payload);
    exit;
}

function app_json_error(string $message, int $status = 400, string $key = 'message', array $extra = []): never
{
    $payload = array_merge(['ok' => false, $key => $message], $extra);

    app_json_response($payload, $status);
}

function app_require_method(array|string $allowedMethods): void
{
    $allowed = array_map(
        static fn (string $method): string => strtoupper(trim($method)),
        is_array($allowedMethods) ? $allowedMethods : [$allowedMethods]
    );
    $current = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

    if (!in_array($current, $allowed, true)) {
        if (!headers_sent()) {
            header('Allow: ' . implode(', ', $allowed));
        }

        app_json_error('Metodo no permitido.', 405);
    }
}

function app_require_json_content_type(bool $allowEmpty = false): void
{
    $contentType = app_request_content_type();

    if ($contentType === '' && $allowEmpty) {
        return;
    }

    if ($contentType !== 'application/json') {
        security_log_event('invalid_content_type', [
            'endpoint' => app_request_endpoint(),
            'content_type' => $contentType,
        ]);

        app_json_error('Content-Type no permitido.', 415);
    }
}

function security_log_event(string $eventType, array $metadata = [], ?int $userId = null, ?string $endpoint = null): void
{
    try {
        $payload = $metadata === []
            ? null
            : app_json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $resolvedUserId = $userId;
        if ($resolvedUserId === null && function_exists('current_user')) {
            $user = current_user();
            $sessionUserId = isset($user['id']) ? (int) $user['id'] : 0;
            $resolvedUserId = $sessionUserId > 0 ? $sessionUserId : null;
        }

        $statement = db()->prepare(
            'INSERT INTO security_events (user_id, event_type, endpoint, ip_address, user_agent, metadata_json)
             VALUES (:user_id, :event_type, :endpoint, :ip_address, :user_agent, :metadata_json)'
        );
        $statement->bindValue(':user_id', $resolvedUserId, $resolvedUserId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $statement->bindValue(':event_type', substr($eventType, 0, 100), PDO::PARAM_STR);
        $statement->bindValue(':endpoint', substr((string) ($endpoint ?? app_request_endpoint()), 0, 190), PDO::PARAM_STR);
        $statement->bindValue(':ip_address', function_exists('client_ip_address') ? client_ip_address() : substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45), PDO::PARAM_STR);
        $statement->bindValue(':user_agent', function_exists('client_user_agent') ? client_user_agent() : substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255), PDO::PARAM_STR);
        $statement->bindValue(':metadata_json', $payload, $payload === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->execute();
    } catch (Throwable $exception) {
        // Nunca bloquea la peticion si el registro de seguridad falla.
    }
}

function api_authenticated_user_or_error(): array
{
    if (!function_exists('is_authenticated') || !is_authenticated()) {
        app_json_error('Sesion no valida.', 401, 'message', [
            'redirect' => function_exists('app_url') ? app_url('login_url') : './login.php',
        ]);
    }

    return current_user() ?? [];
}

function api_registered_user_or_error(string $message = 'Necesitas una cuenta registrada para acceder a esta funcion.'): array
{
    $user = api_authenticated_user_or_error();
    $userType = strtolower(trim((string) ($user['type'] ?? '')));
    $userRole = strtolower(trim((string) ($user['role'] ?? '')));
    $userId = isset($user['id']) ? (int) $user['id'] : 0;

    if ($userType === 'guest' || $userRole === 'guest' || $userId <= 0) {
        app_json_error($message, 403, 'message', [
            'redirect' => function_exists('app_url') ? app_url('login_url') : './login.php',
        ]);
    }

    return $user;
}

function api_admin_user_or_error(): array
{
    $user = api_authenticated_user_or_error();
    $access = function_exists('dashboard_access_context')
        ? dashboard_access_context($user)
        : (($user['role'] ?? 'guest') === 'admin' ? 'admin' : 'guest');

    if ($access !== 'admin') {
        security_log_event('admin_access_denied', [
            'endpoint' => app_request_endpoint(),
        ], isset($user['id']) ? (int) $user['id'] : null);

        app_json_error('No autorizado.', 403, 'error');
    }

    return $user;
}

function app_rate_limit_context(?array $user = null, array $extra = []): array
{
    $resolvedUser = $user;

    if ($resolvedUser === null && function_exists('current_user')) {
        $resolvedUser = current_user();
    }

    $userId = isset($resolvedUser['id']) ? (int) $resolvedUser['id'] : 0;
    $sessionToken = trim((string) ($resolvedUser['session_token'] ?? ''));

    if ($sessionToken === '' && session_status() === PHP_SESSION_ACTIVE) {
        $sessionToken = session_id();
    }

    return array_merge([
        'endpoint' => app_request_endpoint(),
        'ip_address' => function_exists('client_ip_address') ? client_ip_address() : substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
        'user_id' => $userId > 0 ? $userId : null,
        'session_token' => $sessionToken,
    ], $extra);
}
