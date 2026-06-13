<?php
declare(strict_types=1);

/**
 * Script de instalación y sincronización de la tabla agenda_events.
 *
 * Uso: php backend/install_agenda_migration.php
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/fallas_2027_calendar.php';

define('COLOR_GREEN', "\033[0;32m");
define('COLOR_RED', "\033[0;31m");
define('COLOR_YELLOW', "\033[1;33m");
define('COLOR_RESET', "\033[0m");

function log_info(string $message): void
{
    echo COLOR_GREEN . "✓ " . COLOR_RESET . $message . PHP_EOL;
}

function log_error(string $message): void
{
    echo COLOR_RED . "✗ " . COLOR_RESET . $message . PHP_EOL;
}

function log_section(string $title): void
{
    echo PHP_EOL . COLOR_YELLOW . "=== " . $title . " ===" . COLOR_RESET . PHP_EOL;
}

function agenda_events_columns(PDO $pdo): array
{
    $columns = [];

    foreach ($pdo->query('SHOW COLUMNS FROM agenda_events') as $row) {
        $columns[(string) $row['Field']] = true;
    }

    return $columns;
}

function ensure_agenda_events_schema(PDO $pdo): void
{
    $columns = agenda_events_columns($pdo);

    if (!isset($columns['is_featured'])) {
        $pdo->exec(
            'ALTER TABLE agenda_events
             ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER is_all_day'
        );
    }

    if (!isset($columns['updated_at'])) {
        $pdo->exec(
            'ALTER TABLE agenda_events
             ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
        );
    }
}

try {
    log_section('Instalación de Tabla de Agenda');

    $pdo = db();
    log_info('Conexión a la base de datos correcta');

    $createTableSql = <<<'SQL'
CREATE TABLE IF NOT EXISTS `agenda_events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `event_date` DATE NOT NULL COMMENT 'Fecha del evento en formato YYYY-MM-DD',
  `sort_datetime` DATETIME NOT NULL COMMENT 'Fecha y hora para ordenamiento (incluye hora de inicio)',
  `display_time` VARCHAR(50) NOT NULL COMMENT 'Hora a mostrar en la UI (ej: 08:00, 12:30, 20:00-23:00)',
  `title` VARCHAR(255) NOT NULL COMMENT 'Nombre del evento',
  `description` TEXT COMMENT 'Descripción detallada del evento',
  `location` VARCHAR(255) NOT NULL DEFAULT 'Valencia' COMMENT 'Ubicación del evento',
  `category` VARCHAR(100) COMMENT 'Categoría del evento',
  `route_text` VARCHAR(255) COMMENT 'Descripción de la ruta o recorrido si aplica',
  `is_all_day` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Si es verdadero, no tiene hora específica',
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Si se destaca como evento especial/en vivo',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_event_date` (`event_date`),
  INDEX `idx_sort_datetime` (`sort_datetime`),
  INDEX `idx_category` (`category`),
  INDEX `idx_is_all_day` (`is_all_day`),
  INDEX `idx_date_time` (`event_date`, `sort_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabla de eventos de agenda para Fallas 2027 y posteriores'
SQL;

    log_section('Creando Tabla');
    $pdo->exec($createTableSql);
    log_info("Tabla 'agenda_events' creada correctamente o ya existente");
    ensure_agenda_events_schema($pdo);
    log_info("Esquema de 'agenda_events' verificado");

    $events = fallas_2027_calendar_events();
    $range = fallas_2027_calendar_date_range();

    log_section('Sincronizando Agenda 2027');

    $pdo->beginTransaction();

    $deleteStmt = $pdo->prepare(
        'DELETE FROM agenda_events
         WHERE event_date BETWEEN :start_date AND :end_date'
    );
    $deleteStmt->execute([
        'start_date' => $range['start'],
        'end_date' => $range['cleanup_end'],
    ]);

    $insertStmt = $pdo->prepare(
        'INSERT INTO agenda_events
        (event_date, sort_datetime, display_time, title, description, location, category, route_text, is_all_day, is_featured)
        VALUES
        (:event_date, :sort_datetime, :display_time, :title, :description, :location, :category, :route_text, :is_all_day, :is_featured)'
    );

    foreach ($events as $event) {
        $insertStmt->execute([
            'event_date' => $event['event_date'],
            'sort_datetime' => $event['sort_datetime'],
            'display_time' => $event['display_time'],
            'title' => $event['title'],
            'description' => $event['description'],
            'location' => $event['location'],
            'category' => $event['agenda_category'],
            'route_text' => $event['route_text'],
            'is_all_day' => $event['is_all_day'] ? 1 : 0,
            'is_featured' => $event['is_featured'] ? 1 : 0,
        ]);
    }

    $pdo->commit();
    log_info('Agenda 2027 sincronizada con ' . count($events) . ' eventos');

    log_section('Verificación Final');
    $countStmt = $pdo->query('SELECT COUNT(*) as cnt FROM agenda_events');
    $finalCount = (int) ($countStmt?->fetch(PDO::FETCH_ASSOC)['cnt'] ?? 0);
    log_info('Total de eventos en la tabla: ' . $finalCount);

    $dateRangeStmt = $pdo->query('SELECT MIN(event_date) as min_date, MAX(event_date) as max_date FROM agenda_events');
    $dateRange = $dateRangeStmt?->fetch(PDO::FETCH_ASSOC);
    if ($dateRange && $dateRange['min_date'] && $dateRange['max_date']) {
        log_info('Rango de fechas: ' . $dateRange['min_date'] . ' a ' . $dateRange['max_date']);
    }

    log_section('Instalación Completada');
    log_info("La tabla 'agenda_events' está lista para usar");
    log_info('Acceso: GET /api/agenda.php');
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    log_error('Error durante la instalación:');
    log_error($exception->getMessage());
    exit(1);
}
