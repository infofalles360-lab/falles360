<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    gamification_bootstrap();
    echo 'Insignias activas: ' . gamification_count_active_badges() . PHP_EOL;
    echo 'Rutas activas: ' . gamification_count_active_routes() . PHP_EOL;
} catch (Throwable $exception) {
    fwrite(STDERR, "No se pudo sembrar el catalogo de gamificacion: " . $exception->getMessage() . PHP_EOL);
    exit(1);
}
