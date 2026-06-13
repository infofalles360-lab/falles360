ALTER TABLE `marketplace_experiences`
  ADD COLUMN `location` VARCHAR(120) DEFAULT '' AFTER `action_label`,
  ADD COLUMN `duration` VARCHAR(80) DEFAULT '' AFTER `location`,
  ADD COLUMN `capacity` VARCHAR(80) DEFAULT '' AFTER `duration`,
  ADD COLUMN `business_name` VARCHAR(190) DEFAULT '' AFTER `capacity`,
  ADD COLUMN `image_url` TEXT NULL AFTER `business_name`,
  ADD COLUMN `contact_channel` VARCHAR(120) DEFAULT '' AFTER `image_url`;
