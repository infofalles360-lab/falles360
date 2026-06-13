<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/smtp_mailer.php';

function newsletter_ensure_table(): void
{
    db()->exec("CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        email VARCHAR(190) NOT NULL,
        source VARCHAR(120) DEFAULT 'landing',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        ip_hash CHAR(64) DEFAULT '',
        user_agent VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_newsletter_email (email),
        INDEX idx_newsletter_status (status),
        INDEX idx_newsletter_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function newsletter_storage_dir(): string
{
    return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'newsletter';
}

function newsletter_ensure_storage_dir(): string
{
    $dir = newsletter_storage_dir();

    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('No se pudo crear la carpeta de newsletter.');
    }

    return $dir;
}

function newsletter_store_signup_file(array $signup): string
{
    $dir = newsletter_ensure_storage_dir();
    $timestamp = date('Ymd-His');
    $emailSlug = preg_replace('/[^a-z0-9]+/i', '-', (string) ($signup['email'] ?? 'signup')) ?: 'signup';
    $fileName = $timestamp . '-' . trim(strtolower($emailSlug), '-') . '.json';
    $path = $dir . DIRECTORY_SEPARATOR . $fileName;

    $payload = json_encode($signup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payload === false) {
        throw new RuntimeException('No se pudo serializar el registro de newsletter.');
    }

    if (file_put_contents($path, $payload . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException('No se pudo guardar el registro de newsletter en disco.');
    }

    return $path;
}

function newsletter_send_admin_notification(array $signup, string $storagePath): bool
{
    $recipient = 'info.falles360@gmail.com';
    $subject = 'Nueva suscripcion newsletter Falles360';
    $body = implode("\n", [
        'Ha llegado una nueva suscripcion desde la landing de Falles360.',
        '',
        'Nombre: ' . (string) ($signup['name'] ?? ''),
        'Email: ' . (string) ($signup['email'] ?? ''),
        'Origen: ' . (string) ($signup['source'] ?? 'landing'),
        'Fecha: ' . (string) ($signup['created_at'] ?? date('c')),
        'IP hash: ' . (string) ($signup['ip_hash'] ?? ''),
        'User-Agent: ' . (string) ($signup['user_agent'] ?? ''),
        'Archivo: ' . $storagePath,
    ]);

    if (smtp_is_configured()) {
        return smtp_send_mail($recipient, $subject, $body, (string) ($signup['email'] ?? ''));
    }

    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: Falles360 Newsletter <no-reply@falles360.local>',
        'Reply-To: ' . (string) ($signup['email'] ?? 'no-reply@falles360.local'),
    ];

    return @mail($recipient, mb_encode_mimeheader($subject, 'UTF-8'), $body, implode("\r\n", $headers));
}

try {
    app_require_method('POST');
    app_require_json_content_type();

    rate_limit_api_enforce('api_newsletter', [
        ['scope' => 'ip', 'max' => 10, 'window' => 3600],
        ['scope' => 'session', 'max' => 5, 'window' => 3600],
    ], app_rate_limit_context());

    $payload = app_request_json_payload(4096);
    app_validate_payload_keys($payload, ['name', 'email', 'source'], true);

    $name = app_validate_string($payload['name'] ?? '', 'Nombre', [
        'min' => 2,
        'max' => 190,
        'normalize_spaces' => true,
    ]);
    $email = app_validate_email($payload['email'] ?? '', 'Email');
    $source = app_validate_string($payload['source'] ?? 'landing', 'Origen', [
        'allow_empty' => true,
        'max' => 120,
        'normalize_spaces' => true,
    ]);
    if ($source === '') {
        $source = 'landing';
    }

    newsletter_ensure_table();

    $ipHash = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    $userAgent = mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);

    $statement = db()->prepare(
        "INSERT INTO newsletter_subscribers (name, email, source, status, ip_hash, user_agent)
         VALUES (:name, :email, :source, 'active', :ip_hash, :user_agent)
         ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            source = VALUES(source),
            status = 'active',
            ip_hash = VALUES(ip_hash),
            user_agent = VALUES(user_agent),
            updated_at = CURRENT_TIMESTAMP"
    );
    $statement->execute([
        'name' => $name,
        'email' => $email,
        'source' => $source,
        'ip_hash' => $ipHash,
        'user_agent' => $userAgent,
    ]);

    $signup = [
        'name' => $name,
        'email' => $email,
        'source' => $source,
        'status' => 'active',
        'ip_hash' => $ipHash,
        'user_agent' => $userAgent,
        'created_at' => date('c'),
    ];

    $storagePath = newsletter_store_signup_file($signup);
    $mailSent = newsletter_send_admin_notification($signup, $storagePath);

    if (!$mailSent) {
        error_log('Newsletter signup mail() failed for ' . $email . ' -> info.falles360@gmail.com');
    }

    app_json_response([
        'ok' => true,
        'message' => 'Suscripcion guardada.',
        'mail_sent' => $mailSent,
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo guardar la suscripcion.', 500);
}
