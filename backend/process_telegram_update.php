<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    $raw = file_get_contents('php://stdin');

    if (!is_string($raw) || trim($raw) === '') {
        throw new RuntimeException('No se ha recibido ningun update de Telegram.');
    }

    $payload = json_decode($raw, true);

    if (!is_array($payload)) {
        throw new RuntimeException('El update de Telegram no es JSON valido.');
    }

    $payload = app_sanitize_input_array($payload);

    telegram_handle_update($payload);
    telegram_mark_payload_update_as_processed($payload);

    echo json_encode([
        'ok' => true,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . PHP_EOL);
    exit(1);
}
