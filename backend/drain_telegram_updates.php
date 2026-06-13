<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    if (!telegram_is_configured()) {
        throw new RuntimeException('El bot de Telegram no esta configurado.');
    }

    $result = telegram_drain_updates(false);

    echo json_encode([
        'ok' => true,
        'message' => 'Updates de Telegram procesados.',
        'processed' => (int) ($result['processed'] ?? 0),
        'nextOffset' => $result['nextOffset'] ?? null,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
} catch (Throwable $exception) {
    fwrite(STDERR, 'No se pudieron procesar los updates de Telegram: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
