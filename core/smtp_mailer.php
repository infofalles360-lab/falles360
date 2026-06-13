<?php
declare(strict_types=1);

function smtp_env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);

    if ($value === false) {
        return $default;
    }

    $trimmed = trim((string) $value);
    return $trimmed !== '' ? $trimmed : $default;
}

function smtp_is_configured(): bool
{
    return smtp_env('FALLES_SMTP_HOST') !== null
        && smtp_env('FALLES_SMTP_USERNAME') !== null
        && smtp_env('FALLES_SMTP_PASSWORD') !== null
        && smtp_env('FALLES_SMTP_FROM') !== null;
}

function smtp_send_mail(string $to, string $subject, string $body, ?string $replyTo = null, ?string $htmlBody = null): bool
{
    $host = smtp_env('FALLES_SMTP_HOST');
    $port = (int) (smtp_env('FALLES_SMTP_PORT', '587') ?? '587');
    $encryption = strtolower((string) (smtp_env('FALLES_SMTP_ENCRYPTION', 'tls') ?? 'tls'));
    $username = smtp_env('FALLES_SMTP_USERNAME');
    $password = smtp_env('FALLES_SMTP_PASSWORD');
    $from = smtp_env('FALLES_SMTP_FROM');
    $timeout = max(5, min(30, (int) (smtp_env('FALLES_SMTP_TIMEOUT', '15') ?? '15')));

    if ($host === null || $username === null || $password === null || $from === null) {
        return false;
    }

    // Google displays app passwords in groups, but SMTP expects the 16 characters without spaces.
    if (strtolower($host) === 'smtp.gmail.com') {
        $password = preg_replace('/\s+/', '', $password) ?? $password;
    }

    $transport = $encryption === 'ssl' ? 'ssl://' : 'tcp://';
    $socket = @stream_socket_client(
        $transport . $host . ':' . $port,
        $errorNumber,
        $errorMessage,
        $timeout,
    );

    if (!is_resource($socket)) {
        error_log('SMTP connect failed: ' . $errorNumber . ' ' . $errorMessage);
        return false;
    }

    stream_set_timeout($socket, $timeout);

    try {
        smtp_expect_code($socket, [220]);
        smtp_command($socket, 'EHLO localhost', [250]);

        if ($encryption === 'tls') {
            smtp_command($socket, 'STARTTLS', [220]);

            $cryptoEnabled = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            if ($cryptoEnabled !== true) {
                throw new RuntimeException('No se pudo activar TLS en SMTP.');
            }

            smtp_command($socket, 'EHLO localhost', [250]);
        }

        smtp_command($socket, 'AUTH LOGIN', [334]);
        smtp_command($socket, base64_encode($username), [334]);
        smtp_command($socket, base64_encode($password), [235]);
        smtp_command($socket, 'MAIL FROM:<' . $from . '>', [250]);
        smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        smtp_command($socket, 'DATA', [354]);

        $headers = [
            'Date: ' . date(DATE_RFC2822),
            'From: Falles360 <' . $from . '>',
            'To: <' . $to . '>',
            'Subject: ' . smtp_encode_header($subject),
            'MIME-Version: 1.0',
        ];

        if ($replyTo !== null && trim($replyTo) !== '') {
            $headers[] = 'Reply-To: ' . trim($replyTo);
        }

        $normalizedBody = str_replace(["\r\n", "\r"], "\n", $body);
        $normalizedBody = preg_replace('/^\./m', '..', $normalizedBody) ?? $normalizedBody;
        $normalizedTextBody = str_replace("\n", "\r\n", $normalizedBody);

        if ($htmlBody !== null && trim($htmlBody) !== '') {
            $boundary = 'falles360-' . bin2hex(random_bytes(8));
            $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';

            $normalizedHtml = str_replace(["\r\n", "\r"], "\n", $htmlBody);
            $normalizedHtml = str_replace("\n", "\r\n", $normalizedHtml);

            $payload = implode("\r\n", $headers)
                . "\r\n\r\n"
                . '--' . $boundary . "\r\n"
                . "Content-Type: text/plain; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: 8bit\r\n\r\n"
                . $normalizedTextBody . "\r\n"
                . '--' . $boundary . "\r\n"
                . "Content-Type: text/html; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: 8bit\r\n\r\n"
                . $normalizedHtml . "\r\n"
                . '--' . $boundary . "--\r\n.";
        } else {
            $headers[] = 'Content-Type: text/plain; charset=UTF-8';
            $headers[] = 'Content-Transfer-Encoding: 8bit';
            $payload = implode("\r\n", $headers) . "\r\n\r\n" . $normalizedTextBody . "\r\n.";
        }

        smtp_write($socket, $payload . "\r\n");
        smtp_expect_code($socket, [250]);
        smtp_command($socket, 'QUIT', [221]);

        fclose($socket);
        return true;
    } catch (Throwable $exception) {
        error_log('SMTP send failed: ' . $exception->getMessage());
        fclose($socket);
        return false;
    }
}

function smtp_command($socket, string $command, array $expectedCodes): void
{
    smtp_write($socket, $command . "\r\n");
    smtp_expect_code($socket, $expectedCodes);
}

function smtp_write($socket, string $data): void
{
    $written = fwrite($socket, $data);
    if ($written === false || $written < strlen($data)) {
        throw new RuntimeException('No se pudo escribir en el socket SMTP.');
    }
}

function smtp_expect_code($socket, array $expectedCodes): void
{
    $response = smtp_read_response($socket);
    $code = (int) substr($response, 0, 3);

    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('Respuesta SMTP inesperada: ' . trim($response));
    }
}

function smtp_read_response($socket): string
{
    $response = '';

    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;

        if (strlen($line) < 4) {
            break;
        }

        if ($line[3] === ' ') {
            break;
        }
    }

    if ($response === '') {
        throw new RuntimeException('Respuesta SMTP vacia.');
    }

    return $response;
}

function smtp_encode_header(string $value): string
{
    $encoded = mb_encode_mimeheader($value, 'UTF-8', 'B', "\r\n");
    return $encoded !== false ? $encoded : $value;
}
