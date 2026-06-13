<?php
declare(strict_types=1);

function solicitudes_ensure_table(): void
{
    db()->exec("CREATE TABLE IF NOT EXISTS solicitudes (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        email VARCHAR(190) NOT NULL,
        source VARCHAR(120) DEFAULT 'whitelist',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        ip_hash CHAR(64) DEFAULT '',
        user_agent VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_solicitudes_email (email),
        INDEX idx_solicitudes_status (status),
        INDEX idx_solicitudes_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function solicitudes_count_active(): int
{
    solicitudes_ensure_table();

    $statement = db()->query("SELECT COUNT(*) AS total FROM solicitudes WHERE status = 'active'");
    $row = $statement ? ($statement->fetch() ?: []) : [];

    return max(0, (int) ($row['total'] ?? 0));
}

function solicitudes_upsert(array $solicitud): array
{
    solicitudes_ensure_table();

    $statement = db()->prepare(
        "INSERT INTO solicitudes (name, email, source, status, ip_hash, user_agent)
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
        'name' => (string) ($solicitud['name'] ?? ''),
        'email' => (string) ($solicitud['email'] ?? ''),
        'source' => (string) ($solicitud['source'] ?? 'whitelist'),
        'ip_hash' => (string) ($solicitud['ip_hash'] ?? ''),
        'user_agent' => (string) ($solicitud['user_agent'] ?? ''),
    ]);

    return [
        'name' => (string) ($solicitud['name'] ?? ''),
        'email' => (string) ($solicitud['email'] ?? ''),
        'source' => (string) ($solicitud['source'] ?? 'whitelist'),
        'status' => 'active',
        'ip_hash' => (string) ($solicitud['ip_hash'] ?? ''),
        'user_agent' => (string) ($solicitud['user_agent'] ?? ''),
        'request_origin' => (string) ($solicitud['request_origin'] ?? ''),
        'referer' => (string) ($solicitud['referer'] ?? ''),
        'created_at' => date('c'),
    ];
}

function solicitudes_send_admin_notification(array $solicitud): bool
{
    $recipient = 'info.falles360@gmail.com';
    $subject = 'Nueva solicitud de acceso anticipado Falles360';
    $body = implode("\n", [
        'Ha llegado una nueva solicitud desde la pagina de acceso anticipado de Falles360.',
        '',
        'Nombre: ' . (string) ($solicitud['name'] ?? ''),
        'Email: ' . (string) ($solicitud['email'] ?? ''),
        'Origen: ' . (string) ($solicitud['source'] ?? 'whitelist'),
        'Fecha: ' . (string) ($solicitud['created_at'] ?? date('c')),
        'IP hash: ' . (string) ($solicitud['ip_hash'] ?? ''),
        'User-Agent: ' . (string) ($solicitud['user_agent'] ?? ''),
        'Origin: ' . (string) ($solicitud['request_origin'] ?? ''),
        'Referer: ' . (string) ($solicitud['referer'] ?? ''),
    ]);
    $htmlBody = solicitudes_admin_email_html($solicitud);

    if (function_exists('smtp_is_configured') && smtp_is_configured()) {
        return smtp_send_mail($recipient, $subject, $body, (string) ($solicitud['email'] ?? ''), $htmlBody);
    }

    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: Falles360 <no-reply@falles360.local>',
        'Reply-To: ' . (string) ($solicitud['email'] ?? 'no-reply@falles360.local'),
    ];

    return @mail($recipient, mb_encode_mimeheader($subject, 'UTF-8'), $body, implode("\r\n", $headers));
}

function solicitudes_send_user_confirmation(array $solicitud): bool
{
    $recipient = trim((string) ($solicitud['email'] ?? ''));
    if ($recipient === '') {
        return false;
    }

    $subject = 'Tu acceso anticipado a Falles360 esta reservado';
    $body = implode("\n", [
        'Hola ' . (string) ($solicitud['name'] ?? '') . ',',
        '',
        'Tu sitio en la lista de acceso anticipado de Falles360 ya esta reservado.',
        'Te avisaremos por este correo cuando activemos la entrada prioritaria.',
        '',
        'Resumen:',
        'Nombre: ' . (string) ($solicitud['name'] ?? ''),
        'Email: ' . $recipient,
        'Origen: ' . (string) ($solicitud['source'] ?? 'whitelist'),
        'Fecha: ' . (string) ($solicitud['created_at'] ?? date('c')),
        '',
        'Gracias por apuntarte,',
        'Falles360',
    ]);
    $htmlBody = solicitudes_user_email_html($solicitud);

    if (function_exists('smtp_is_configured') && smtp_is_configured()) {
        return smtp_send_mail($recipient, $subject, $body, null, $htmlBody);
    }

    return false;
}

function solicitudes_admin_email_html(array $solicitud): string
{
    $name = solicitudes_html((string) ($solicitud['name'] ?? ''));
    $email = solicitudes_html((string) ($solicitud['email'] ?? ''));
    $source = solicitudes_html((string) ($solicitud['source'] ?? 'whitelist'));
    $createdAt = solicitudes_html((string) ($solicitud['created_at'] ?? date('c')));
    $origin = solicitudes_html((string) ($solicitud['request_origin'] ?? ''));
    $referer = solicitudes_html((string) ($solicitud['referer'] ?? ''));
    $userAgent = solicitudes_html((string) ($solicitud['user_agent'] ?? ''));
    $ipHash = solicitudes_html((string) ($solicitud['ip_hash'] ?? ''));

    return '<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f7f4f1;font-family:Segoe UI,Arial,sans-serif;color:#1a110a;">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid rgba(240,90,40,0.16);border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(26,17,10,0.08);">
    <div style="padding:20px 24px;background:linear-gradient(135deg,#fff1ea 0%,#fff9f5 100%);border-bottom:1px solid rgba(240,90,40,0.12);">
      <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#ffffff;color:#c03e15;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">Nueva solicitud</div>
      <h1 style="margin:14px 0 6px;font-size:34px;line-height:0.95;font-weight:900;text-transform:uppercase;">Falles<span style="color:#f05a28;">360</span></h1>
      <p style="margin:0;color:#7a6a60;font-size:14px;line-height:1.6;">Ha entrado un nuevo lead desde la whitelist de acceso anticipado.</p>
    </div>
    <div style="padding:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 10px;">
        <tr><td style="width:150px;color:#9b8a7e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;">Nombre</td><td style="background:#fff8f4;border:1px solid rgba(240,90,40,0.12);border-radius:14px;padding:12px 14px;font-size:15px;font-weight:700;">' . $name . '</td></tr>
        <tr><td style="width:150px;color:#9b8a7e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;">Email</td><td style="background:#fff8f4;border:1px solid rgba(240,90,40,0.12);border-radius:14px;padding:12px 14px;font-size:15px;font-weight:700;"><a href="mailto:' . rawurlencode((string) ($solicitud['email'] ?? '')) . '" style="color:#1a110a;text-decoration:none;">' . $email . '</a></td></tr>
        <tr><td style="width:150px;color:#9b8a7e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;">Origen</td><td style="background:#fff8f4;border:1px solid rgba(240,90,40,0.12);border-radius:14px;padding:12px 14px;font-size:14px;">' . $source . '</td></tr>
        <tr><td style="width:150px;color:#9b8a7e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;">Fecha</td><td style="background:#fff8f4;border:1px solid rgba(240,90,40,0.12);border-radius:14px;padding:12px 14px;font-size:14px;">' . $createdAt . '</td></tr>
      </table>
      <div style="margin-top:18px;padding:16px 18px;border-radius:18px;background:#1a110a;color:#ffffff;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#ffd1bf;">Contexto tecnico</p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;"><strong style="color:#ffffff;">Origin:</strong> ' . $origin . '</p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;"><strong style="color:#ffffff;">Referer:</strong> ' . $referer . '</p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;"><strong style="color:#ffffff;">User-Agent:</strong> ' . $userAgent . '</p>
        <p style="margin:0;font-size:13px;line-height:1.6;"><strong style="color:#ffffff;">IP hash:</strong> ' . $ipHash . '</p>
      </div>
    </div>
  </div>
</body>
</html>';
}

function solicitudes_user_email_html(array $solicitud): string
{
    $name = solicitudes_html((string) ($solicitud['name'] ?? ''));
    $email = solicitudes_html((string) ($solicitud['email'] ?? ''));
    $createdAt = solicitudes_html((string) ($solicitud['created_at'] ?? date('c')));

    return '<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f7f4f1;font-family:Segoe UI,Arial,sans-serif;color:#1a110a;">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid rgba(240,90,40,0.16);border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(26,17,10,0.08);">
    <div style="padding:22px 24px;background:linear-gradient(135deg,#fff1ea 0%,#fff8f4 100%);border-bottom:1px solid rgba(240,90,40,0.12);">
      <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#ffffff;color:#c03e15;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">Acceso reservado</div>
      <h1 style="margin:14px 0 6px;font-size:34px;line-height:0.95;font-weight:900;text-transform:uppercase;">Ya estas en <span style="color:#f05a28;">Falles360</span></h1>
      <p style="margin:0;color:#7a6a60;font-size:14px;line-height:1.6;">Tu sitio en la whitelist de acceso anticipado ya esta guardado.</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hola <strong>' . $name . '</strong>, te avisaremos por este correo cuando activemos la entrada prioritaria a la app.</p>
      <div style="padding:18px;border-radius:18px;background:#fff8f4;border:1px solid rgba(240,90,40,0.12);">
        <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#c03e15;">Resumen</p>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;"><strong>Nombre:</strong> ' . $name . '</p>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;"><strong>Email:</strong> ' . $email . '</p>
        <p style="margin:0;font-size:14px;line-height:1.6;"><strong>Fecha:</strong> ' . $createdAt . '</p>
      </div>
      <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#7a6a60;">Mientras tanto, estamos preparando mapa, agenda, rutas y Pasaporte Fallero para Fallas 2027.</p>
    </div>
  </div>
</body>
</html>';
}

function solicitudes_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}
