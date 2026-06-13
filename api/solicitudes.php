<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/smtp_mailer.php';
require_once __DIR__ . '/../core/solicitudes_repository.php';

function solicitudes_api_allowed_origin(): string
{
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') {
        return '';
    }

    $allowedOrigins = preg_split(
        '/[\s,]+/',
        trim((string) (getenv('SOLICITUDES_ALLOWED_ORIGINS') ?: '')),
        -1,
        PREG_SPLIT_NO_EMPTY
    ) ?: [];

    if ($allowedOrigins !== []) {
        return in_array($origin, $allowedOrigins, true) ? $origin : '';
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $sameOrigin = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');

    return rtrim($origin, '/') === rtrim($sameOrigin, '/') ? $origin : '';
}

function solicitudes_api_apply_cors_headers(): void
{
    if (headers_sent()) {
        return;
    }

    $allowedOrigin = solicitudes_api_allowed_origin();

    if ($allowedOrigin !== '') {
        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Max-Age: 86400');
}

function solicitudes_api_payload(): array
{
    $contentType = app_request_content_type();

    if ($contentType === 'application/json') {
        return app_request_json_payload(4096);
    }

    if ($contentType === 'application/x-www-form-urlencoded' || $contentType === 'multipart/form-data') {
        return app_sanitize_input_array($_POST);
    }

    if ($contentType === '') {
        return [];
    }

    throw new InvalidArgumentException('Content-Type no permitido.');
}

solicitudes_api_apply_cors_headers();

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    app_require_method(['GET', 'POST']);

    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'GET') {
        rate_limit_api_enforce('api_solicitudes_count', [
            ['scope' => 'ip', 'max' => 120, 'window' => 3600],
        ], app_rate_limit_context());

        app_json_response([
            'ok' => true,
            'count' => solicitudes_count_active(),
        ]);
    }

    csrf_assert_valid('CSRF token no valido. Intentalo de nuevo.');

    rate_limit_api_enforce('api_solicitudes', [
        ['scope' => 'ip', 'max' => 10, 'window' => 3600],
        ['scope' => 'session', 'max' => 5, 'window' => 3600],
    ], app_rate_limit_context());

    $payload = solicitudes_api_payload();
    app_validate_payload_keys($payload, ['name', 'email', 'source'], true);

    $name = app_validate_string($payload['name'] ?? '', 'Nombre', [
        'min' => 2,
        'max' => 190,
        'normalize_spaces' => true,
    ]);
    $email = app_validate_email($payload['email'] ?? '', 'Email');
    $source = app_validate_string($payload['source'] ?? 'whitelist_page', 'Origen', [
        'allow_empty' => true,
        'max' => 120,
        'normalize_spaces' => true,
    ]);
    if ($source === '') {
        $source = 'whitelist_page';
    }

    $solicitud = solicitudes_upsert([
        'name' => $name,
        'email' => $email,
        'source' => $source,
        'ip_hash' => hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '')),
        'user_agent' => mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
        'request_origin' => mb_substr((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), 0, 255),
        'referer' => mb_substr((string) ($_SERVER['HTTP_REFERER'] ?? ''), 0, 500),
    ]);

    $adminMailSent = solicitudes_send_admin_notification($solicitud);
    $userMailSent = solicitudes_send_user_confirmation($solicitud);

    if (!$adminMailSent) {
        error_log('Solicitudes mail() failed for ' . $email . ' -> info.falles360@gmail.com');
    }

    $mailWarning = null;
    if (!$adminMailSent && !$userMailSent) {
        $mailWarning = 'La solicitud se ha guardado, pero el aviso por email no se ha podido completar.';
    } elseif (!$adminMailSent) {
        $mailWarning = 'La solicitud se ha guardado y el usuario ha recibido confirmacion, pero el aviso interno ha fallado.';
    } elseif (!$userMailSent) {
        $mailWarning = 'La solicitud se ha guardado y el aviso interno ha salido, pero no se ha podido enviar la confirmacion al usuario.';
    }

    $response = [
        'ok' => true,
        'message' => $mailWarning ?? 'Solicitud guardada y notificada por email.',
        'mail_sent' => $adminMailSent,
        'admin_mail_sent' => $adminMailSent,
        'user_mail_sent' => $userMailSent,
        'count' => solicitudes_count_active(),
    ];
    if ($mailWarning !== null) {
        $response['mail_warning'] = $mailWarning;
    }

    app_json_response($response, 200);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo guardar la solicitud.', 500);
}
