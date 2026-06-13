-- =============================================================================
-- SECURITY HARDENING MIGRATIONS - Falles360
-- =============================================================================
-- This migration script implements comprehensive security enhancements:
-- - Account lockout mechanism- - Enhanced rate limiting table with indices
-- - Security events audit trail
-- - User sessions management
-- - Password reset tokens
-- - Access logs tracking
--
-- Run this script against your database with sufficient privileges
-- Date: 2026-04-21
-- Version: 1.0
-- =============================================================================

SET FOREIGN_KEY_CHECKS=0;
SET SESSION sql_mode='STRICT_TRANS_TABLES';

-- =============================================================================
-- 1. ENHANCE USERS TABLE - Add account lockout support
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS `failed_login_attempts` INT NOT NULL DEFAULT 0 AFTER `last_login_at`;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `account_locked_until` DATETIME NULL AFTER `failed_login_attempts`;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP AFTER `updated_at`;
ALTER TABLE users ADD INDEX IF NOT EXISTS `idx_status_locked` (`status`, `account_locked_until`);
ALTER TABLE users ADD INDEX IF NOT EXISTS `idx_email_normalized` (`email`);

-- =============================================================================
-- 2. CREATE/ENHANCE RATE_LIMITS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `rate_key` VARCHAR(64) NOT NULL COMMENT 'SHA256 hash of (action|endpoint|scope|identifier)',
  `endpoint` VARCHAR(190) NOT NULL,
  `rate_scope` VARCHAR(32) NOT NULL COMMENT 'ip, user, session, email, or custom',
  `user_id` INT NULL,
  `ip_address` VARCHAR(45) NULL,
  `bucket_start` DATETIME NOT NULL COMMENT 'Start of the time bucket',
  `bucket_seconds` INT NOT NULL COMMENT 'Window size in seconds',
  `attempts` INT NOT NULL DEFAULT 0,
  `blocked_until` DATETIME NULL COMMENT 'If set, requests are blocked until this time',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_rate_key_bucket` (`rate_key`, `bucket_start`),
  KEY `idx_endpoint` (`endpoint`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_bucket_start` (`bucket_start`),
  KEY `idx_blocked_until` (`blocked_until`),
  CONSTRAINT `fk_rate_limits_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Rate limiting bucket tracking for DDoS/brute force protection';

-- =============================================================================
-- 3. CREATE/ENHANCE LOGIN_ATTEMPTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(190) NOT NULL,
  `normalized_email` VARCHAR(190) NOT NULL COMMENT 'Lowercase for deduplication',
  `user_id` INT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` VARCHAR(255),
  `endpoint` VARCHAR(190) NOT NULL,
  `success` BOOLEAN NOT NULL DEFAULT FALSE,
  `attempted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  KEY `idx_email` (`email`),
  KEY `idx_normalized_email` (`normalized_email`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_success_attempted` (`success`, `attempted_at`),
  KEY `idx_attempted_at` (`attempted_at`),
  CONSTRAINT `fk_login_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail of login attempts for security analysis';

-- =============================================================================
-- 4. CREATE USER_SESSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `session_token` VARCHAR(64) NOT NULL COMMENT 'SHA256 hash of the session token',
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_activity_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_session_token` (`session_token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_revoked_at` (`revoked_at`),
  KEY `idx_ip_address` (`ip_address`),
  CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Persistent session tokens with expiration and revocation support';

-- =============================================================================
-- 5. CREATE SECURITY_EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `security_events` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `endpoint` VARCHAR(190) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` VARCHAR(255),
  `metadata_json` JSON NULL COMMENT 'Additional event context',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  KEY `idx_event_type` (`event_type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_event_user` (`event_type`, `user_id`),
  CONSTRAINT `fk_security_events_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail of security-relevant events (CSRF, rate limiting, etc)';

-- =============================================================================
-- 6. CREATE PASSWORD_RESET_TOKENS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL COMMENT 'SHA256 hash of the reset token',
  `used_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL COMMENT '2 hours from creation',
  
  UNIQUE KEY `uk_token_hash` (`token_hash`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_password_reset_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='One-time password reset tokens with 2-hour expiration';

-- =============================================================================
-- 7. CREATE ACCESS_LOGS TABLE (Optional but recommended)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `access_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `endpoint` VARCHAR(190) NOT NULL,
  `method` VARCHAR(10) NOT NULL,
  `status_code` INT,
  `ip_address` VARCHAR(45),
  `response_time_ms` INT,
  `accessed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  KEY `idx_user_id` (`user_id`),
  KEY `idx_endpoint` (`endpoint`),
  KEY `idx_accessed_at` (`accessed_at`),
  CONSTRAINT `fk_access_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comprehensive access logging for performance and security analysis';

-- =============================================================================
-- 8. ADD ACCOUNT LOCKOUT CONSTRAINT (Account locked after 5 failed attempts)
-- =============================================================================
-- This is enforced via application logic, but document it here:
-- After 5 consecutive failed login attempts within 10 minutes,
-- account_locked_until is set to NOW() + 15 MINUTES
-- Users cannot log in until account_locked_until has passed

-- =============================================================================
-- 9. CLEANUP ROUTINES (Run periodically via cron/scheduler)
-- =============================================================================

-- Prune expired rate limit buckets older than 2 days
-- DELETE FROM rate_limits
-- WHERE bucket_start < (NOW() - INTERVAL 2 DAY)
--   AND (blocked_until IS NULL OR blocked_until < (NOW() - INTERVAL 1 DAY));

-- Prune expired sessions
-- DELETE FROM user_sessions
-- WHERE expires_at < NOW();

-- Prune expired password reset tokens
-- DELETE FROM password_reset_tokens
-- WHERE expires_at < NOW();

-- Prune old security events (keep 90 days)
-- DELETE FROM security_events
-- WHERE created_at < (NOW() - INTERVAL 90 DAY);

-- Prune old access logs (keep 30 days)
-- DELETE FROM access_logs
-- WHERE accessed_at < (NOW() - INTERVAL 30 DAY);

-- =============================================================================
-- 10. SET FOREIGN_KEY_CHECKS BACK ON
-- =============================================================================

SET FOREIGN_KEY_CHECKS=1;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify all tables were created:
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
-- WHERE TABLE_SCHEMA = DATABASE() 
--   AND TABLE_NAME IN (
--     'rate_limits', 'login_attempts', 'user_sessions', 
--     'security_events', 'password_reset_tokens', 'access_logs'
--   );

-- Check users table has new columns:
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'users' 
--   AND TABLE_SCHEMA = DATABASE()
--   AND COLUMN_NAME IN ('failed_login_attempts', 'account_locked_until', 'created_at');

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
