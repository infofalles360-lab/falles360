CREATE TABLE IF NOT EXISTS gamification_profiles (
    user_id INT(11) NOT NULL,
    xp_total INT(11) NOT NULL DEFAULT 0,
    level_number INT(11) NOT NULL DEFAULT 1,
    level_name VARCHAR(80) NOT NULL DEFAULT 'Curioso',
    level_progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    current_level_xp INT(11) NOT NULL DEFAULT 0,
    next_level_xp INT(11) DEFAULT NULL,
    distinct_fallas_visited INT(11) NOT NULL DEFAULT 0,
    total_visit_events INT(11) NOT NULL DEFAULT 0,
    routes_completed INT(11) NOT NULL DEFAULT 0,
    routes_started INT(11) NOT NULL DEFAULT 0,
    neighborhoods_explored INT(11) NOT NULL DEFAULT 0,
    neighborhoods_completed INT(11) NOT NULL DEFAULT 0,
    badges_unlocked INT(11) NOT NULL DEFAULT 0,
    favorite_fallas_count INT(11) NOT NULL DEFAULT 0,
    content_reads_count INT(11) NOT NULL DEFAULT 0,
    navigation_uses_count INT(11) NOT NULL DEFAULT 0,
    total_progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    fallas_completion_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    last_activity_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_gamification_profiles_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS badges (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(140) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('descubrimiento', 'recorrido', 'fallas destacadas', 'experiencia fallera') NOT NULL,
    rarity ENUM('common', 'special', 'epic', 'legendary') NOT NULL DEFAULT 'common',
    icon_path VARCHAR(255) DEFAULT NULL,
    unlock_condition_text VARCHAR(255) NOT NULL,
    rule_key VARCHAR(80) NOT NULL DEFAULT 'metric_threshold',
    rule_config LONGTEXT DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT(11) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_badges_slug (slug),
    KEY idx_badges_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_badges (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    badge_id INT(11) NOT NULL,
    unlocked_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_badges_user_badge (user_id, badge_id),
    KEY idx_user_badges_user_unlocked (user_id, unlocked_at),
    CONSTRAINT fk_user_badges_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_badges_badge
        FOREIGN KEY (badge_id) REFERENCES badges(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS falla_visits (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    falla_id INT(11) NOT NULL,
    visit_source ENUM('gps', 'qr', 'manual') NOT NULL DEFAULT 'gps',
    verified_radius_meters INT(11) NOT NULL DEFAULT 80,
    distance_meters DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    qr_reference VARCHAR(140) DEFAULT NULL,
    visit_day DATE NOT NULL,
    visited_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_falla_visits_user_falla_day (user_id, falla_id, visit_day),
    KEY idx_falla_visits_user_time (user_id, visited_at),
    KEY idx_falla_visits_falla (falla_id),
    CONSTRAINT fk_falla_visits_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_falla_visits_falla
        FOREIGN KEY (falla_id) REFERENCES fallas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gamification_routes (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(140) NOT NULL,
    slug VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'recorrido',
    min_completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT(11) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gamification_routes_slug (slug),
    KEY idx_gamification_routes_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gamification_route_fallas (
    id INT(11) NOT NULL AUTO_INCREMENT,
    route_id INT(11) NOT NULL,
    falla_id INT(11) NOT NULL,
    stop_order INT(11) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gamification_route_fallas (route_id, falla_id),
    KEY idx_gamification_route_fallas_order (route_id, stop_order),
    CONSTRAINT fk_gamification_route_fallas_route
        FOREIGN KEY (route_id) REFERENCES gamification_routes(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_gamification_route_fallas_falla
        FOREIGN KEY (falla_id) REFERENCES fallas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_completions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    route_id INT(11) NOT NULL,
    visited_fallas_count INT(11) NOT NULL DEFAULT 0,
    total_fallas_count INT(11) NOT NULL DEFAULT 0,
    progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    last_evaluated_at DATETIME NOT NULL,
    completed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_route_completions_user_route (user_id, route_id),
    KEY idx_route_completions_user_completed (user_id, is_completed),
    CONSTRAINT fk_route_completions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_route_completions_route
        FOREIGN KEY (route_id) REFERENCES gamification_routes(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gamification_zones (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(140) NOT NULL,
    slug VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    is_emblematic TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT(11) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gamification_zones_slug (slug),
    KEY idx_gamification_zones_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gamification_zone_fallas (
    id INT(11) NOT NULL AUTO_INCREMENT,
    zone_id INT(11) NOT NULL,
    falla_id INT(11) NOT NULL,
    stop_order INT(11) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gamification_zone_fallas (zone_id, falla_id),
    KEY idx_gamification_zone_fallas_order (zone_id, stop_order),
    CONSTRAINT fk_gamification_zone_fallas_zone
        FOREIGN KEY (zone_id) REFERENCES gamification_zones(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_gamification_zone_fallas_falla
        FOREIGN KEY (falla_id) REFERENCES fallas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_activity_log (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body VARCHAR(255) NOT NULL,
    related_entity_type VARCHAR(80) DEFAULT NULL,
    related_entity_id INT(11) DEFAULT NULL,
    meta_json LONGTEXT DEFAULT NULL,
    occurred_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_activity_log_user_time (user_id, occurred_at),
    KEY idx_user_activity_log_event (user_id, event_type),
    CONSTRAINT fk_user_activity_log_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS xp_events (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    description VARCHAR(200) NOT NULL,
    amount INT(11) NOT NULL,
    source_type VARCHAR(80) DEFAULT NULL,
    source_id INT(11) DEFAULT NULL,
    unique_key VARCHAR(190) DEFAULT NULL,
    meta_json LONGTEXT DEFAULT NULL,
    occurred_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_xp_events_unique_key (unique_key),
    KEY idx_xp_events_user_time (user_id, occurred_at),
    KEY idx_xp_events_user_type (user_id, event_type),
    CONSTRAINT fk_xp_events_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS challenges (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(140) NOT NULL,
    slug VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    challenge_type ENUM('daily', 'weekly', 'seasonal', 'special') NOT NULL DEFAULT 'daily',
    rule_key VARCHAR(80) NOT NULL,
    rule_config LONGTEXT DEFAULT NULL,
    reward_xp INT(11) NOT NULL DEFAULT 0,
    starts_at DATETIME DEFAULT NULL,
    ends_at DATETIME DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_challenges_slug (slug),
    KEY idx_challenges_active_window (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_challenges (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    challenge_id INT(11) NOT NULL,
    progress_value INT(11) NOT NULL DEFAULT 0,
    target_value INT(11) NOT NULL DEFAULT 0,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    completed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_challenges_user_challenge (user_id, challenge_id),
    KEY idx_user_challenges_user_completed (user_id, is_completed),
    CONSTRAINT fk_user_challenges_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_challenges_challenge
        FOREIGN KEY (challenge_id) REFERENCES challenges(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
