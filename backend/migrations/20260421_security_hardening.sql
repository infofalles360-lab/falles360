SET @schema_name = DATABASE();

CREATE TABLE IF NOT EXISTS rate_limits (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    rate_key CHAR(64) NOT NULL,
    endpoint VARCHAR(190) NOT NULL,
    rate_scope VARCHAR(32) NOT NULL,
    user_id INT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    bucket_start DATETIME NOT NULL,
    bucket_seconds INT UNSIGNED NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    blocked_until DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rate_limits_bucket (rate_key, bucket_start),
    KEY idx_rate_limits_endpoint (endpoint, bucket_start),
    KEY idx_rate_limits_user (user_id, bucket_start),
    KEY idx_rate_limits_ip (ip_address, bucket_start),
    KEY idx_rate_limits_blocked (blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS security_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    event_type VARCHAR(100) NOT NULL,
    endpoint VARCHAR(190) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_security_events_created (created_at),
    KEY idx_security_events_event_type (event_type, created_at),
    KEY idx_security_events_user (user_id, created_at),
    KEY idx_security_events_ip (ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL DEFAULT '',
    normalized_email VARCHAR(190) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    endpoint VARCHAR(190) NULL,
    success TINYINT(1) NOT NULL DEFAULT 0,
    attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_login_attempts_attempted_at (attempted_at),
    KEY idx_login_attempts_email (normalized_email, attempted_at),
    KEY idx_login_attempts_ip (ip_address, attempted_at),
    KEY idx_login_attempts_success (success, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    session_token CHAR(64) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_sessions_token (session_token),
    KEY idx_user_sessions_user (user_id, revoked_at, expires_at),
    KEY idx_user_sessions_expires (expires_at),
    KEY idx_user_sessions_revoked (revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

DROP PROCEDURE IF EXISTS falles360_apply_security_hardening$$
CREATE PROCEDURE falles360_apply_security_hardening()
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'login_attempts'
          AND COLUMN_NAME = 'attempt_time'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'login_attempts'
          AND COLUMN_NAME = 'attempted_at'
    ) THEN
        ALTER TABLE login_attempts ADD COLUMN attempted_at DATETIME NULL AFTER success;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'login_attempts'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'login_attempts'
              AND COLUMN_NAME = 'normalized_email'
        ) THEN
            ALTER TABLE login_attempts ADD COLUMN normalized_email VARCHAR(190) NULL AFTER email;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'login_attempts'
              AND COLUMN_NAME = 'user_agent'
        ) THEN
            ALTER TABLE login_attempts ADD COLUMN user_agent VARCHAR(255) NULL AFTER ip_address;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'login_attempts'
              AND COLUMN_NAME = 'endpoint'
        ) THEN
            ALTER TABLE login_attempts ADD COLUMN endpoint VARCHAR(190) NULL AFTER user_agent;
        END IF;

        UPDATE login_attempts
        SET normalized_email = LOWER(TRIM(email))
        WHERE normalized_email IS NULL
           OR normalized_email = '';

        IF EXISTS (
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'login_attempts'
              AND COLUMN_NAME = 'attempt_time'
        ) THEN
            UPDATE login_attempts
            SET attempted_at = COALESCE(attempted_at, attempt_time)
            WHERE attempted_at IS NULL;
        END IF;

        UPDATE login_attempts
        SET attempted_at = COALESCE(attempted_at, CURRENT_TIMESTAMP)
        WHERE attempted_at IS NULL;

        ALTER TABLE login_attempts
            MODIFY COLUMN email VARCHAR(190) NOT NULL DEFAULT '',
            MODIFY COLUMN normalized_email VARCHAR(190) NULL,
            MODIFY COLUMN ip_address VARCHAR(45) NULL,
            MODIFY COLUMN user_agent VARCHAR(255) NULL,
            MODIFY COLUMN endpoint VARCHAR(190) NULL,
            MODIFY COLUMN attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'login_attempts'
              AND INDEX_NAME = 'idx_login_attempts_attempted_at'
        ) THEN
            ALTER TABLE login_attempts ADD KEY idx_login_attempts_attempted_at (attempted_at);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'login_attempts'
              AND INDEX_NAME = 'idx_login_attempts_email'
        ) THEN
            ALTER TABLE login_attempts ADD KEY idx_login_attempts_email (normalized_email, attempted_at);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'login_attempts'
              AND INDEX_NAME = 'idx_login_attempts_ip'
        ) THEN
            ALTER TABLE login_attempts ADD KEY idx_login_attempts_ip (ip_address, attempted_at);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'login_attempts'
              AND INDEX_NAME = 'idx_login_attempts_success'
        ) THEN
            ALTER TABLE login_attempts ADD KEY idx_login_attempts_success (success, attempted_at);
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'user_sessions'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'user_sessions'
              AND COLUMN_NAME = 'last_activity_at'
        ) THEN
            ALTER TABLE user_sessions ADD COLUMN last_activity_at DATETIME NULL AFTER user_agent;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'user_sessions'
              AND COLUMN_NAME = 'revoked_at'
        ) THEN
            ALTER TABLE user_sessions ADD COLUMN revoked_at DATETIME NULL AFTER expires_at;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'user_sessions'
              AND COLUMN_NAME = 'created_at'
        ) THEN
            ALTER TABLE user_sessions ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER revoked_at;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'user_sessions'
              AND COLUMN_NAME = 'updated_at'
        ) THEN
            ALTER TABLE user_sessions ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
        END IF;

        UPDATE user_sessions
        SET session_token = LOWER(SHA2(session_token, 256))
        WHERE NOT (CHAR_LENGTH(session_token) = 64 AND session_token REGEXP '^[0-9a-f]{64}$');

        UPDATE user_sessions
        SET last_activity_at = COALESCE(last_activity_at, created_at, CURRENT_TIMESTAMP)
        WHERE last_activity_at IS NULL;

        UPDATE user_sessions
        SET expires_at = COALESCE(expires_at, DATE_ADD(COALESCE(last_activity_at, created_at, CURRENT_TIMESTAMP), INTERVAL 30 DAY))
        WHERE expires_at IS NULL;

        ALTER TABLE user_sessions
            MODIFY COLUMN session_token CHAR(64) NOT NULL,
            MODIFY COLUMN ip_address VARCHAR(45) NULL,
            MODIFY COLUMN user_agent VARCHAR(255) NULL,
            MODIFY COLUMN last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            MODIFY COLUMN expires_at DATETIME NOT NULL,
            MODIFY COLUMN revoked_at DATETIME NULL;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'user_sessions'
              AND INDEX_NAME = 'uq_user_sessions_token'
        ) THEN
            ALTER TABLE user_sessions ADD UNIQUE KEY uq_user_sessions_token (session_token);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'user_sessions'
              AND INDEX_NAME = 'idx_user_sessions_user'
        ) THEN
            ALTER TABLE user_sessions ADD KEY idx_user_sessions_user (user_id, revoked_at, expires_at);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'user_sessions'
              AND INDEX_NAME = 'idx_user_sessions_expires'
        ) THEN
            ALTER TABLE user_sessions ADD KEY idx_user_sessions_expires (expires_at);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'user_sessions'
              AND INDEX_NAME = 'idx_user_sessions_revoked'
        ) THEN
            ALTER TABLE user_sessions ADD KEY idx_user_sessions_revoked (revoked_at);
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'password_reset_tokens'
    ) THEN
        UPDATE password_reset_tokens
        SET token = LOWER(SHA2(token, 256))
        WHERE NOT (CHAR_LENGTH(token) = 64 AND token REGEXP '^[0-9a-f]{64}$');

        ALTER TABLE password_reset_tokens
            MODIFY COLUMN token CHAR(64) NOT NULL;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'password_reset_tokens'
              AND INDEX_NAME = 'uq_password_reset_token'
        ) THEN
            ALTER TABLE password_reset_tokens ADD UNIQUE KEY uq_password_reset_token (token);
        END IF;
    END IF;
END$$

CALL falles360_apply_security_hardening()$$
DROP PROCEDURE IF EXISTS falles360_apply_security_hardening$$

DELIMITER ;
