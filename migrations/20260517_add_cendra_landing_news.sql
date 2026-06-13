ALTER TABLE `cendra_articles`
  ADD COLUMN `landing_published` TINYINT(1) NOT NULL DEFAULT 0 AFTER `telegram_sent`,
  ADD COLUMN `landing_published_at` DATETIME NULL AFTER `landing_published`,
  ADD COLUMN `landing_title` VARCHAR(255) DEFAULT '' AFTER `landing_published_at`,
  ADD COLUMN `landing_excerpt` TEXT NULL AFTER `landing_title`,
  ADD COLUMN `landing_featured` TINYINT(1) NOT NULL DEFAULT 0 AFTER `landing_excerpt`;

CREATE INDEX `idx_cendra_articles_landing`
  ON `cendra_articles` (`landing_published`, `landing_featured`, `landing_published_at`);
