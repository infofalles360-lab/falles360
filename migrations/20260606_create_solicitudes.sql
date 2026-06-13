CREATE TABLE IF NOT EXISTS `solicitudes` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(190) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `source` VARCHAR(120) DEFAULT 'whitelist',
  `status` VARCHAR(30) NOT NULL DEFAULT 'active',
  `ip_hash` CHAR(64) DEFAULT '',
  `user_agent` VARCHAR(255) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_solicitudes_email` (`email`),
  INDEX `idx_solicitudes_status` (`status`),
  INDEX `idx_solicitudes_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
