CREATE TABLE IF NOT EXISTS activity_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT(11) DEFAULT NULL,
    falla_id INT(11) DEFAULT NULL,
    event_type VARCHAR(80) NOT NULL,
    weight DECIMAL(8,2) NOT NULL DEFAULT 1.00,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_activity_events_created (created_at),
    KEY idx_activity_events_bbox (latitude, longitude, created_at),
    KEY idx_activity_events_falla (falla_id, created_at),
    KEY idx_activity_events_user (user_id, created_at),
    CONSTRAINT fk_activity_events_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_activity_events_falla
        FOREIGN KEY (falla_id) REFERENCES fallas(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
