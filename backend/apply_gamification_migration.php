<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    gamification_ensure_schema();
    echo "Esquema de gamificacion listo.\n";
} catch (Throwable $exception) {
    fwrite(STDERR, "No se pudo aplicar la migracion de gamificacion: " . $exception->getMessage() . PHP_EOL);
    exit(1);
}
