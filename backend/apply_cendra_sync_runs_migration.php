<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../core/cendra_sync_repository.php';

try {
    cendra_sync_runs_ensure_table();
    echo "Tabla cendra_sync_runs lista.\n";
} catch (Throwable $exception) {
    fwrite(STDERR, "No se pudo crear cendra_sync_runs: " . $exception->getMessage() . PHP_EOL);
    exit(1);
}
