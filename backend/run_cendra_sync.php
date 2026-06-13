<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

$sourceUrl = isset($argv[1]) ? trim((string) $argv[1]) : '';
$limit = isset($argv[2]) ? (int) $argv[2] : null;

try {
    $result = cendra_sync_articles($sourceUrl !== '' ? $sourceUrl : null, $limit);

    echo json_encode([
        'ok' => true,
        'runId' => (int) ($result['run_id'] ?? 0),
        'sourceUrl' => (string) ($result['source_url'] ?? cendra_source_url()),
        'processedItems' => (int) ($result['processed_items'] ?? 0),
        'newItems' => (int) ($result['new_items'] ?? 0),
        'updatedItems' => (int) ($result['updated_items'] ?? 0),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
} catch (Throwable $exception) {
    fwrite(STDERR, 'No se pudo sincronizar Cendra: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
