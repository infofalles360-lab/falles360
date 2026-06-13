<?php
declare(strict_types=1);

require_once __DIR__ . '/../../core/bootstrap.php';

const FALLAS360_MONITOR_USER_AGENT = 'Fallas360 Monitor/1.0 (+https://falles360.com)';
const FALLAS360_MONITOR_TIMEOUT_SECONDS = 20;

if (!defined('TELEGRAM_BOT_TOKEN')) {
    define('TELEGRAM_BOT_TOKEN', telegram_env('TELEGRAM_BOT_TOKEN', ''));
}

if (!defined('TELEGRAM_CHAT_ID')) {
    define('TELEGRAM_CHAT_ID', telegram_env('TELEGRAM_CHAT_ID')
        ?? telegram_env('TELEGRAM_ADMIN_CHAT_ID')
        ?? telegram_env('TELEGRAM_CHANNEL_ID')
        ?? telegram_env('TELEGRAM_CHANNEL_CHAT_ID')
        ?? '');
}

function monitor_db(): PDO
{
    return db();
}

function monitor_column_exists(string $table, string $column): bool
{
    $statement = monitor_db()->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table
           AND COLUMN_NAME = :column'
    );
    $statement->execute([
        'table' => $table,
        'column' => $column,
    ]);

    return (int) $statement->fetchColumn() > 0;
}

function monitor_table_exists(string $table): bool
{
    $statement = monitor_db()->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table'
    );
    $statement->execute(['table' => $table]);

    return (int) $statement->fetchColumn() > 0;
}

function monitor_ensure_schema(): void
{
    $db = monitor_db();

    $db->exec(
        "CREATE TABLE IF NOT EXISTS update_sources (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            url TEXT NOT NULL,
            source_type VARCHAR(50) DEFAULT 'html',
            priority_score INT DEFAULT 50,
            last_hash VARCHAR(255) DEFAULT NULL,
            last_checked_at DATETIME DEFAULT NULL,
            last_changed_at DATETIME DEFAULT NULL,
            active TINYINT(1) DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_update_sources_active (active),
            KEY idx_update_sources_last_checked (last_checked_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $db->exec(
        "CREATE TABLE IF NOT EXISTS detected_updates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            source_id INT NOT NULL,
            title VARCHAR(255) DEFAULT NULL,
            url TEXT DEFAULT NULL,
            update_type VARCHAR(100) DEFAULT NULL,
            priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
            affected_module VARCHAR(100) DEFAULT NULL,
            extracted_content MEDIUMTEXT DEFAULT NULL,
            status ENUM('pending','approved','rejected','published') DEFAULT 'pending',
            detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            approved_at DATETIME DEFAULT NULL,
            published_at DATETIME DEFAULT NULL,
            sent_in_daily_summary TINYINT(1) DEFAULT 0,
            KEY idx_detected_updates_source (source_id),
            KEY idx_detected_updates_priority (priority),
            KEY idx_detected_updates_status (status),
            KEY idx_detected_updates_detected_at (detected_at),
            CONSTRAINT fk_detected_updates_source FOREIGN KEY (source_id) REFERENCES update_sources(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $db->exec(
        "CREATE TABLE IF NOT EXISTS source_checks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            source_id INT NOT NULL,
            status VARCHAR(50) DEFAULT NULL,
            response_code INT DEFAULT NULL,
            checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            error_message TEXT DEFAULT NULL,
            KEY idx_source_checks_source (source_id),
            KEY idx_source_checks_checked_at (checked_at),
            CONSTRAINT fk_source_checks_source FOREIGN KEY (source_id) REFERENCES update_sources(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $db->exec(
        "CREATE TABLE IF NOT EXISTS source_snapshots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            source_id INT NOT NULL,
            content_hash VARCHAR(255),
            content_text MEDIUMTEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_source_snapshots_source (source_id),
            KEY idx_source_snapshots_hash (content_hash),
            CONSTRAINT fk_source_snapshots_source FOREIGN KEY (source_id) REFERENCES update_sources(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    if (!monitor_column_exists('update_sources', 'updated_at')) {
        $db->exec('ALTER TABLE update_sources ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    }

    if (!monitor_column_exists('detected_updates', 'approved_at')) {
        $db->exec('ALTER TABLE detected_updates ADD COLUMN approved_at DATETIME DEFAULT NULL AFTER detected_at');
    }

    if (!monitor_column_exists('detected_updates', 'published_at')) {
        $db->exec('ALTER TABLE detected_updates ADD COLUMN published_at DATETIME DEFAULT NULL AFTER approved_at');
    }
}

function monitor_seed_default_sources(): void
{
    $sources = [
        ['Cendra Digital', 'https://www.cendradigital.com/', 'html', 85],
        ['Junta Central Fallera', 'https://www.fallas.com/', 'html', 90],
        ['Premios Junta Central Fallera', 'https://www.fallas.com/premios/', 'html', 95],
        ['Noticias Secretaria JCF', 'https://www.fallas.com/noticias-cultura/', 'html', 80],
        ['Ayuntamiento de Valencia - Fallas', 'https://www.valencia.es/cas/fallas', 'html', 85],
        ['Open Data / Geoportal Ayuntamiento de Valencia', 'https://geoportal.valencia.es/apps/GeoportalHome/es/inicio/', 'html', 75],
    ];

    $exists = monitor_db()->prepare(
        'SELECT id, last_hash FROM update_sources WHERE name = :name OR url = :url LIMIT 1'
    );
    $update = monitor_db()->prepare(
        'UPDATE update_sources
         SET url = :url,
             source_type = :source_type,
             priority_score = :priority_score,
             active = 1
         WHERE id = :id
           AND (last_hash IS NULL OR last_hash = \'\')'
    );
    $insert = monitor_db()->prepare(
        'INSERT INTO update_sources (name, url, source_type, priority_score, active)
         VALUES (:name, :url, :source_type, :priority_score, 1)'
    );

    foreach ($sources as [$name, $url, $sourceType, $priorityScore]) {
        $exists->execute([
            'name' => $name,
            'url' => $url,
        ]);

        $existing = $exists->fetch();

        if (is_array($existing)) {
            $update->execute([
                'url' => $url,
                'source_type' => $sourceType,
                'priority_score' => $priorityScore,
                'id' => (int) $existing['id'],
            ]);
            continue;
        }

        $insert->execute([
            'name' => $name,
            'url' => $url,
            'source_type' => $sourceType,
            'priority_score' => $priorityScore,
        ]);
    }
}

function monitor_bootstrap(): void
{
    monitor_ensure_schema();
    monitor_seed_default_sources();
}

function monitor_now(): string
{
    return (new DateTimeImmutable())->format('Y-m-d H:i:s');
}

function monitor_html_escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
