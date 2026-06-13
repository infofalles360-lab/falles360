<?php
declare(strict_types=1);

function csrf_session_key(): string
{
    return '_csrf_token';
}

function csrf_cookie_name(): string
{
    $sessionName = session_name();

    return ($sessionName !== '' ? $sessionName : 'falles360_session') . '_csrf';
}

function csrf_token(): string
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        throw new RuntimeException('La sesion debe estar iniciada para generar un token CSRF.');
    }

    $sessionKey = csrf_session_key();
    $existing = $_SESSION[$sessionKey] ?? null;

    if (is_string($existing) && preg_match('/^[a-f0-9]{64}$/', $existing) === 1) {
        return $existing;
    }

    $token = bin2hex(random_bytes(32));
    $_SESSION[$sessionKey] = $token;

    return $token;
}

function csrf_issue_cookie(): void
{
    if (app_is_cli() || session_status() !== PHP_SESSION_ACTIVE || headers_sent()) {
        return;
    }

    setcookie(csrf_cookie_name(), csrf_token(), [
        'expires' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => app_is_https_request(),
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
}

function csrf_token_input(): string
{
    // Use native escaping to avoid dependency on helper h() order of loading.
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') . '">';
}

function csrf_request_token(): string
{
    $headerValue = trim((string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));

    if ($headerValue !== '') {
        return $headerValue;
    }

    return (string) app_sanitize_input_value($_POST['csrf_token'] ?? '', [
        'max_bytes' => 128,
    ]);
}

function csrf_request_origin_base(): string
{
    $scheme = app_is_https_request() ? 'https' : 'http';

    return $scheme . '://' . app_request_host();
}

function csrf_request_has_valid_origin(): bool
{
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    $referer = trim((string) ($_SERVER['HTTP_REFERER'] ?? ''));
    $allowedOrigin = strtolower(csrf_request_origin_base());

    if ($origin !== '') {
        return strtolower(rtrim($origin, '/')) === rtrim($allowedOrigin, '/');
    }

    if ($referer !== '') {
        $refererOrigin = parse_url($referer, PHP_URL_SCHEME) . '://' . parse_url($referer, PHP_URL_HOST);
        $refererPort = parse_url($referer, PHP_URL_PORT);

        if (is_int($refererPort)) {
            $refererOrigin .= ':' . $refererPort;
        }

        return strtolower(rtrim($refererOrigin, '/')) === rtrim($allowedOrigin, '/');
    }

    return true;
}

function csrf_is_valid_request(): bool
{
    $expected = session_status() === PHP_SESSION_ACTIVE ? ($_SESSION[csrf_session_key()] ?? null) : null;
    $provided = csrf_request_token();

    return is_string($expected)
        && $expected !== ''
        && is_string($provided)
        && $provided !== ''
        && hash_equals($expected, $provided)
        && csrf_request_has_valid_origin();
}

function csrf_assert_valid(string $message = 'CSRF token no valido.'): void
{
    if (app_is_cli()) {
        return;
    }

    if (!csrf_is_valid_request()) {
        security_log_event('csrf_failed', [
            'endpoint' => app_request_endpoint(),
            'origin' => (string) ($_SERVER['HTTP_ORIGIN'] ?? ''),
            'referer' => (string) ($_SERVER['HTTP_REFERER'] ?? ''),
        ]);

        app_json_error($message, 419);
    }
}
