ALTER TABLE `fallas_infantiles`
  ADD COLUMN IF NOT EXISTS `slug` VARCHAR(300) NULL AFTER `nombre`,
  ADD COLUMN IF NOT EXISTS `seccion_label` VARCHAR(60) NULL AFTER `seccion`,
  ADD COLUMN IF NOT EXISTS `presupuesto_eur` DECIMAL(10,2) NULL AFTER `presupuesto`,
  ADD COLUMN IF NOT EXISTS `presupuesto_formateado` VARCHAR(40) NULL AFTER `presupuesto_eur`,
  ADD COLUMN IF NOT EXISTS `clasificacion` VARCHAR(30) NULL AFTER `ciudad`,
  ADD COLUMN IF NOT EXISTS `duplicado_en_fuente` TINYINT(1) NOT NULL DEFAULT 0 AFTER `clasificacion`;

UPDATE `fallas_infantiles` AS target
INNER JOIN `fallas_infantiles_fichas` AS source
  ON source.`jcf_num` = target.`jcf_num`
 AND source.`anio` = target.`anio`
 AND source.`tipo` = target.`tipo`
SET
  target.`nombre` = source.`nombre`,
  target.`slug` = source.`slug`,
  target.`artista` = source.`artista`,
  target.`seccion` = source.`seccion`,
  target.`seccion_label` = source.`seccion_label`,
  target.`presupuesto` = source.`presupuesto_eur`,
  target.`presupuesto_eur` = source.`presupuesto_eur`,
  target.`presupuesto_formateado` = source.`presupuesto_formateado`,
  target.`anio` = source.`anio`,
  target.`tipo` = source.`tipo`,
  target.`ciudad` = source.`ciudad`,
  target.`clasificacion` = source.`clasificacion_estado`,
  target.`duplicado_en_fuente` = source.`duplicado_en_fuente`,
  target.`fuente_url` = source.`fuente_url`;

INSERT INTO `fallas_infantiles` (
  `jcf_num`,
  `nombre`,
  `slug`,
  `artista`,
  `seccion`,
  `seccion_label`,
  `presupuesto`,
  `presupuesto_eur`,
  `presupuesto_formateado`,
  `anio`,
  `tipo`,
  `ciudad`,
  `clasificacion`,
  `duplicado_en_fuente`,
  `fuente_url`
)
SELECT
  source.`jcf_num`,
  source.`nombre`,
  source.`slug`,
  source.`artista`,
  source.`seccion`,
  source.`seccion_label`,
  source.`presupuesto_eur`,
  source.`presupuesto_eur`,
  source.`presupuesto_formateado`,
  source.`anio`,
  source.`tipo`,
  source.`ciudad`,
  source.`clasificacion_estado`,
  source.`duplicado_en_fuente`,
  source.`fuente_url`
FROM `fallas_infantiles_fichas` AS source
LEFT JOIN `fallas_infantiles` AS target
  ON target.`jcf_num` = source.`jcf_num`
 AND target.`anio` = source.`anio`
 AND target.`tipo` = source.`tipo`
WHERE target.`id` IS NULL;

CREATE INDEX IF NOT EXISTS `idx_fallas_infantiles_slug` ON `fallas_infantiles` (`slug`);
CREATE INDEX IF NOT EXISTS `idx_fallas_infantiles_artista` ON `fallas_infantiles` (`artista`);
