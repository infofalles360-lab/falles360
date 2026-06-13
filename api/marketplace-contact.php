<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

function marketplace_contact_header_text(string $value, int $maxLength = 180): string
{
    $value = trim(preg_replace('/[\r\n]+/', ' ', $value) ?? $value);
    return mb_substr($value, 0, $maxLength);
}

function marketplace_contact_recipients(string $businessEmail): array
{
    $emails = [];
    if ($businessEmail !== '' && filter_var($businessEmail, FILTER_VALIDATE_EMAIL)) {
        $emails[] = mb_strtolower($businessEmail);
    }

    $envEmail = trim((string) (getenv('FALLES_MARKETPLACE_CONTACT_EMAIL') ?: ''));
    if ($envEmail !== '') {
        foreach (preg_split('/[,;]/', $envEmail) ?: [] as $email) {
            $email = mb_strtolower(trim($email));
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $emails[] = $email;
            }
        }
    }

    if ($emails === []) {
        try {
            $statement = db()->query("SELECT email FROM users WHERE role IN ('admin', 'support') AND status = 'active' AND email <> ''");
            foreach ($statement->fetchAll() ?: [] as $row) {
                $email = mb_strtolower(trim((string) ($row['email'] ?? '')));
                if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $emails[] = $email;
                }
            }
        } catch (Throwable) {
            // Si no se puede consultar admins, se devuelve la lista acumulada.
        }
    }

    return array_values(array_unique($emails));
}

try {
    app_require_method(['POST']);
    $user = api_registered_user_or_error('Necesitas una cuenta registrada para contactar desde el marketplace.');

    rate_limit_api_enforce('api_marketplace_contact', [
        ['scope' => 'user', 'max' => 12, 'window' => 300],
        ['scope' => 'session', 'max' => 12, 'window' => 300],
    ], app_rate_limit_context($user));

    app_require_json_content_type();
    csrf_assert_valid();

    $payload = app_validate_payload_keys(app_request_json_payload(8192), [
        'businessId',
        'businessName',
        'businessEmail',
        'message',
        'offer',
    ], true);

    $businessId = app_validate_string($payload['businessId'] ?? '', 'Proveedor', ['max' => 120]);
    $businessName = app_validate_string($payload['businessName'] ?? '', 'Proveedor', ['max' => 190]);
    $businessEmail = trim((string) ($payload['businessEmail'] ?? ''));
    if ($businessEmail !== '' && !filter_var($businessEmail, FILTER_VALIDATE_EMAIL)) {
        app_validation_error('Email del proveedor no valido.');
    }
    $message = app_validate_string($payload['message'] ?? '', 'Mensaje', ['min' => 2, 'max' => 2500]);
    $offer = app_validate_string($payload['offer'] ?? '', 'Oferta', ['max' => 1200, 'allow_empty' => true]);
    $recipients = marketplace_contact_recipients($businessEmail);

    if ($recipients === []) {
        app_json_error('Este proveedor no tiene email configurado y no hay correo de administracion disponible.', 422);
    }

    $senderName = marketplace_contact_header_text((string) ($user['name'] ?? 'Usuario Falles360'));
    $senderEmail = trim((string) ($user['email'] ?? ''));
    $safeBusinessName = marketplace_contact_header_text($businessName);
    $subject = mb_encode_mimeheader('Nuevo mensaje desde Falles360 - ' . $safeBusinessName, 'UTF-8');

    $bodyLines = [
        'Has recibido un nuevo mensaje desde el marketplace de Falles360.',
        '',
        'Proveedor: ' . $businessName,
        'ID proveedor: ' . $businessId,
        'Cliente: ' . $senderName,
        'Email cliente: ' . ($senderEmail !== '' ? $senderEmail : 'No disponible'),
    ];

    if ($offer !== '') {
        $bodyLines[] = '';
        $bodyLines[] = 'Oferta / propuesta abierta:';
        $bodyLines[] = $offer;
    }

    $bodyLines[] = '';
    $bodyLines[] = 'Mensaje:';
    $bodyLines[] = $message;
    $bodyLines[] = '';
    $bodyLines[] = 'Puedes responder a este correo para continuar el contacto con el cliente.';

    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: Falles360 Marketplace <no-reply@falles360.local>',
    ];

    if ($senderEmail !== '' && filter_var($senderEmail, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . marketplace_contact_header_text($senderName) . ' <' . $senderEmail . '>';
    }

    $sentCount = 0;
    foreach ($recipients as $recipient) {
        if (@mail($recipient, $subject, implode("\n", $bodyLines), implode("\r\n", $headers))) {
            $sentCount++;
        }
    }

    if ($sentCount === 0) {
        error_log('Marketplace contact mail() failed for business=' . $businessId . ' recipients=' . implode(',', $recipients));
        app_json_error('No se pudo enviar el email al proveedor.', 502);
    }

    app_json_response([
        'ok' => true,
        'sent' => true,
        'recipients' => $sentCount,
        'message' => 'Email enviado al proveedor.',
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo enviar el mensaje al proveedor.', 500);
}
