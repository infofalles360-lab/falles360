CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO roles (name, description) VALUES
('admin', 'Administrador general'),
('commission', 'Comision fallera');

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NULL,
  commission_id INT UNSIGNED NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'commission',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_commission (commission_id),
  CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  slug VARCHAR(190) NULL UNIQUE,
  access_code VARCHAR(80) NULL,
  sector VARCHAR(120) NULL,
  section_name VARCHAR(120) NULL,
  president_name VARCHAR(160) NULL,
  neighborhood VARCHAR(160) NULL,
  address VARCHAR(255) NULL,
  casal_address VARCHAR(255) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  phone VARCHAR(80) NULL,
  email VARCHAR(190) NULL,
  website VARCHAR(255) NULL,
  instagram VARCHAR(160) NULL,
  tiktok VARCHAR(160) NULL,
  facebook VARCHAR(160) NULL,
  logo_path VARCHAR(255) NULL,
  description TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_commissions_status (status),
  INDEX idx_commissions_sector (sector)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INT UNSIGNED NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_id INT UNSIGNED NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'commission';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE commissions ADD COLUMN IF NOT EXISTS sector VARCHAR(120) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS section_name VARCHAR(120) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS casal_address VARCHAR(255) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS phone VARCHAR(80) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS email VARCHAR(190) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS website VARCHAR(255) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS instagram VARCHAR(160) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS tiktok VARCHAR(160) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS facebook VARCHAR(160) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS logo_path VARCHAR(255) NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS description TEXT NULL;

ALTER TABLE events ADD COLUMN IF NOT EXISTS commission_id INT UNSIGNED NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type VARCHAR(80) NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_path VARCHAR(255) NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by INT UNSIGNED NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reviewed_by INT UNSIGNED NULL;
ALTER TABLE events MODIFY status ENUM('draft','pending','published','rejected','scheduled','cancelled','finished') NOT NULL DEFAULT 'draft';

ALTER TABLE users ADD INDEX IF NOT EXISTS idx_users_commission (commission_id);

CREATE TABLE IF NOT EXISTS commission_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commission_id INT UNSIGNED NOT NULL,
  payload JSON NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  submitted_by INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  submitted_at DATETIME NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_profiles_submitter FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_profiles_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_profiles_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monuments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commission_id INT UNSIGNED NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'grande',
  name VARCHAR(190) NOT NULL,
  motto VARCHAR(190) NULL,
  artist VARCHAR(190) NULL,
  sketch_path VARCHAR(255) NULL,
  photos TEXT NULL,
  description TEXT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  section_name VARCHAR(120) NULL,
  budget DECIMAL(12,2) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  created_by INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_monuments_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_monuments_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_monuments_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_monuments_status (status),
  INDEX idx_monuments_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commission_id INT UNSIGNED NULL,
  title VARCHAR(190) NOT NULL,
  event_type VARCHAR(80) NULL,
  event_date DATE NOT NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  location_name VARCHAR(190) NULL,
  address VARCHAR(255) NULL,
  description TEXT NULL,
  image_path VARCHAR(255) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  rejection_reason TEXT NULL,
  created_by INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_commission_panel FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE SET NULL,
  CONSTRAINT fk_events_creator_panel FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_events_reviewer_panel FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_events_status (status),
  INDEX idx_events_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commission_id INT UNSIGNED NOT NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT NULL,
  image_path VARCHAR(255) NULL,
  publish_date DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  created_by INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_news_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_news_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_news_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_news_status (status),
  INDEX idx_news_publish_date (publish_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commission_id INT UNSIGNED NOT NULL,
  album VARCHAR(160) NULL,
  image_path VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  created_by INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gallery_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_gallery_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_gallery_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_gallery_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commission_id INT UNSIGNED NOT NULL,
  name VARCHAR(190) NOT NULL,
  logo_path VARCHAR(255) NULL,
  website VARCHAR(255) NULL,
  category VARCHAR(120) NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  created_by INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sponsors_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_sponsors_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sponsors_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_sponsors_status (status),
  INDEX idx_sponsors_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approvals (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INT UNSIGNED NOT NULL,
  commission_id INT UNSIGNED NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  rejection_reason TEXT NULL,
  requested_by INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_approvals_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE SET NULL,
  CONSTRAINT fk_approvals_requested FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_approvals_reviewed FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_approvals_entity (entity_type, entity_id),
  INDEX idx_approvals_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  commission_id INT UNSIGNED NULL,
  title VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
  INDEX idx_notifications_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commission_id INT UNSIGNED NULL,
  subject VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_messages_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE SET NULL,
  CONSTRAINT fk_admin_messages_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stats (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commission_id INT UNSIGNED NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INT UNSIGNED NULL,
  metric VARCHAR(80) NOT NULL,
  value INT UNSIGNED NOT NULL DEFAULT 0,
  recorded_on DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stats_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
  INDEX idx_stats_metric (metric),
  INDEX idx_stats_recorded_on (recorded_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  commission_id INT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id INT UNSIGNED NULL,
  details TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_activity_commission FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE SET NULL,
  INDEX idx_activity_action (action),
  INDEX idx_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (role_id, name, email, password, role, status)
SELECT r.id, 'Administrador Fallas 360', 'admin@fallas360.local', '$2y$10$RMfW86.uhCwIkaYkbSXiYeKONZY4fxdx3q.5HUy2NHkEGoWJxvrim', 'admin', 'active'
FROM roles r
WHERE r.name = 'admin'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@fallas360.local');

INSERT INTO commissions (name, slug, access_code, sector, section_name, neighborhood, address, casal_address, phone, email, instagram, description, status)
SELECT 'Falla Demo Fallas 360', 'falla-demo-fallas-360', 'FD-001', 'Ruzafa', 'Especial', 'Ruzafa', 'Carrer Demo 1, Valencia', 'Casal Demo, Valencia', '+34 600 000 000', 'demo@fallas360.local', '@fallas360', 'Comision demo para probar el panel privado.', 'active'
WHERE NOT EXISTS (SELECT 1 FROM commissions WHERE slug = 'falla-demo-fallas-360');

INSERT INTO users (role_id, commission_id, name, email, password, role, status)
SELECT r.id, c.id, 'Comision Demo', 'comision@fallas360.local', '$2y$10$RMfW86.uhCwIkaYkbSXiYeKONZY4fxdx3q.5HUy2NHkEGoWJxvrim', 'user', 'active'
FROM roles r, commissions c
WHERE r.name = 'commission'
  AND c.slug = 'falla-demo-fallas-360'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'comision@fallas360.local');

CREATE TABLE IF NOT EXISTS monuments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  commission_id INT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'grande',
  name VARCHAR(190) NOT NULL,
  motto VARCHAR(190) NULL,
  artist VARCHAR(190) NULL,
  sketch_path VARCHAR(255) NULL,
  photos TEXT NULL,
  description TEXT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  section_name VARCHAR(120) NULL,
  budget DECIMAL(12,2) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  created_by INT NULL,
  reviewed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_monuments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  commission_id INT NOT NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT NULL,
  image_path VARCHAR(255) NULL,
  publish_date DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  created_by INT NULL,
  reviewed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_news_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  commission_id INT NOT NULL,
  album VARCHAR(160) NULL,
  image_path VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  created_by INT NULL,
  reviewed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gallery_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  commission_id INT NOT NULL,
  name VARCHAR(190) NOT NULL,
  logo_path VARCHAR(255) NULL,
  website VARCHAR(255) NULL,
  category VARCHAR(120) NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  created_by INT NULL,
  reviewed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sponsors_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INT NOT NULL,
  commission_id INT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  rejection_reason TEXT NULL,
  requested_by INT NULL,
  reviewed_by INT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_approvals_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  commission_id INT NULL,
  title VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  commission_id INT NULL,
  subject VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  commission_id INT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INT NULL,
  metric VARCHAR(80) NOT NULL,
  value INT UNSIGNED NOT NULL DEFAULT 0,
  recorded_on DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stats_metric (metric)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  commission_id INT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id INT NULL,
  details TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
