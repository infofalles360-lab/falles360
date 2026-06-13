CREATE TABLE IF NOT EXISTS cendra_sync_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    started_at DATETIME NOT NULL,
    finished_at DATETIME NULL,
    status VARCHAR(30) NOT NULL,
    new_items INT NOT NULL DEFAULT 0,
    notes TEXT NULL,
    KEY idx_cendra_sync_runs_status (status),
    KEY idx_cendra_sync_runs_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
