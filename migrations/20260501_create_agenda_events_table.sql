-- Migración: Crear tabla agenda_events para Fallas 2027
-- Fecha: 2026-05-01
-- Descripción: Tabla para almacenar los eventos de agenda de Fallas con toda la información necesaria para visualización

-- Crear tabla agenda_events si no existe
CREATE TABLE IF NOT EXISTS `agenda_events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `event_date` DATE NOT NULL COMMENT 'Fecha del evento en formato YYYY-MM-DD',
  `sort_datetime` DATETIME NOT NULL COMMENT 'Fecha y hora para ordenamiento (incluye hora de inicio)',
  `display_time` VARCHAR(50) NOT NULL COMMENT 'Hora a mostrar en la UI (ej: 08:00, 12:30, 20:00-23:00)',
  `title` VARCHAR(255) NOT NULL COMMENT 'Nombre del evento (ej: Mascleta, Ofrenda, Plantà, Cremà)',
  `description` TEXT COMMENT 'Descripción detallada del evento',
  `location` VARCHAR(255) NOT NULL DEFAULT 'Valencia' COMMENT 'Ubicación del evento (ej: Jardines de Turia, Plaza del Ayuntamiento)',
  `category` VARCHAR(100) COMMENT 'Categoría del evento (ej: mascleta, ofrenda, cabalgata, castillo, crema, planta)',
  `route_text` VARCHAR(255) COMMENT 'Descripción de la ruta o recorrido si aplica',
  `is_all_day` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Si es verdadero, no tiene hora específica',
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Si se destaca como evento especial/en vivo',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices para optimizar búsquedas
  INDEX `idx_event_date` (`event_date`),
  INDEX `idx_sort_datetime` (`sort_datetime`),
  INDEX `idx_category` (`category`),
  INDEX `idx_is_all_day` (`is_all_day`),
  INDEX `idx_date_time` (`event_date`, `sort_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabla de eventos de agenda para Fallas 2027 y posteriores';

-- Insertar eventos de ejemplo para Fallas 2027 (del 1 al 19 de marzo)
INSERT INTO `agenda_events` 
(`event_date`, `sort_datetime`, `display_time`, `title`, `description`, `location`, `category`, `route_text`, `is_all_day`, `is_featured`)
VALUES
-- 1 de marzo (Domingo)
('2027-03-01', '2027-03-01 08:00:00', '08:00', 'Plantà', 'Inicio oficial de las Fallas con la plantación de monumentos en toda la ciudad.', 'Toda Valencia', 'planta', 'Recorrido completo de la ciudad', 0, 1),
('2027-03-01', '2027-03-01 18:00:00', '18:00', 'Ofrenda a la Virgen', 'Miles de falleros visten el traje tradicional para ofrecer flores a la Virgen de los Desamparados.', 'Plaza de la Virgen', 'ofrenda', 'Centro histórico', 0, 1),

-- 2 de marzo (Lunes)
('2027-03-02', '2027-03-02 08:00:00', '08:00', 'Mascleta', 'Primer castillo de fuegos de artificio en la plaza del Ayuntamiento.', 'Plaza del Ayuntamiento', 'mascleta', NULL, 0, 0),

-- 3 de marzo (Martes) 
('2027-03-03', '2027-03-03 08:00:00', '08:00', 'Mascleta', 'Segundo castillo piroténico del día.', 'Plaza del Ayuntamiento', 'mascleta', NULL, 0, 0),
('2027-03-03', '2027-03-03 22:00:00', '22:00', 'Castillo de Fuegos', 'Espectáculo piroténico nocturno en los Jardines de Turia.', 'Jardines de Turia', 'castillo', NULL, 0, 0),

-- 4 de marzo (Miércoles)
('2027-03-04', '2027-03-04 08:00:00', '08:00', 'Mascleta', 'Tercera mascleta de la semana.', 'Plaza del Ayuntamiento', 'mascleta', NULL, 0, 0),
('2027-03-04', '2027-03-04 16:00:00', '16:00', 'Cabalgata Infantil', 'Cabalgata con carrozas dirigida al público infantil.', 'Paseo de la Alameda', 'cabalgata', 'Recorrido tradicional', 0, 0),

-- 5 de marzo (Jueves)
('2027-03-05', '2027-03-05 08:00:00', '08:00', 'Mascleta', 'Cuarta mascleta consecutiva.', 'Plaza del Ayuntamiento', 'mascleta', NULL, 0, 0),

-- 6 de marzo (Viernes)
('2027-03-06', '2027-03-06 08:00:00', '08:00', 'Mascleta', 'Última mascleta de la primera semana.', 'Plaza del Ayuntamiento', 'mascleta', NULL, 0, 0),
('2027-03-06', '2027-03-06 20:00:00', '20:00', 'Cabalgata Mayor', 'Gran desfile con carrozas gigantes y el Rey Faller. Evento destacado.', 'Centro de Valencia', 'cabalgata', 'Recorrido principal', 0, 1),

-- 7 de marzo (Sábado) - Segundo domingo fallero
('2027-03-07', '2027-03-07 10:00:00', '10:00', 'Concurso de Monumentos', 'Jurado evalúa los mejores monumentos falleros de la ciudad.', 'Lugares diversos', 'premio', 'Por toda la ciudad', 0, 0),
('2027-03-07', '2027-03-07 22:00:00', '22:00', 'Castillo Especial', 'Espectáculo piroténico especial de la semana.', 'Parque de Cabecera', 'castillo', NULL, 0, 0),

-- 8 de marzo (Domingo) - Semana grande
('2027-03-08', '2027-03-08 08:00:00', '08:00', 'Mascleta', 'Mascleta de la semana grande.', 'Plaza del Ayuntamiento', 'mascleta', NULL, 0, 0),
('2027-03-08', '2027-03-08 12:00:00', '12:00', 'Presentación Reinas', 'Acto oficial con las Reinas y Damas de las Fallas.', 'Plaza del Ayuntamiento', 'evento', NULL, 0, 0),

-- 9 de marzo (Lunes)
('2027-03-09', '2027-03-09 08:00:00', '08:00', 'Mascleta', 'Mascleta lunes de semana grande.', 'Plaza del Ayuntamiento', 'mascleta', NULL, 0, 0),

-- 10 de marzo (Martes)
('2027-03-10', '2027-03-10 08:00:00', '08:00', 'Mascleta', 'Penúltima mascleta antes de la cremà.', 'Plaza del Ayuntamiento', 'mascleta', NULL, 0, 0),

-- 11 de marzo (Miércoles)
('2027-03-11', '2027-03-11 08:00:00', '08:00', 'Mascleta Final', 'Última mascleta del año. Espectáculo culminante.', 'Plaza del Ayuntamiento', 'mascleta', NULL, 0, 1),
('2027-03-11', '2027-03-11 18:00:00', '18:00', 'Ofrenda Final', 'Última ofrenda de flores a la Virgen.', 'Plaza de la Virgen', 'ofrenda', 'Centro histórico', 0, 0),

-- 12 de marzo (Jueves)
('2027-03-12', '2027-03-12 22:00:00', '22:00', 'Castillo Monumental', 'Castillo de fuegos especial monumental.', 'Ciudad de las Ciencias', 'castillo', NULL, 0, 0),

-- 13 de marzo (Viernes)
('2027-03-13', '2027-03-13 20:00:00', '20:00', 'Cabalgata Nocturna', 'Desfile especial nocturno con iluminación.', 'Centro de Valencia', 'cabalgata', 'Recorrido principal', 0, 0),

-- 14 de marzo (Sábado)
('2027-03-14', '2027-03-14 22:00:00', '22:00', 'Cremà General', 'Quema de los monumentos falleros. Acto culminante.', 'Toda Valencia', 'crema', 'Todos los distritos', 0, 1),

-- 15 de marzo (Domingo)
('2027-03-15', '2027-03-15 18:00:00', '18:00', 'Cremà Especial', 'Quema de la Falla Mayor de Valencia. Espectáculo final.', 'Plaza del Ayuntamiento', 'crema', NULL, 0, 1),

-- 16-19 de marzo: Actos post-Fallas
('2027-03-16', '2027-03-16 11:00:00', '11:00', 'Desayuno Fallero', 'Encuentro tradicional de falleros después de las Fallas.', 'Diversos restaurantes', 'evento', NULL, 0, 0),
('2027-03-17', '2027-03-17 20:00:00', '20:00', 'Concierto Homenaje', 'Actuación musical en memoria de las Fallas.', 'Palau de la Música', 'evento', NULL, 0, 0),
('2027-03-19', '2027-03-19 19:00:00', '19:00', 'Clausura Oficial', 'Acto de cierre oficial de las Fallas 2027.', 'Ayuntamiento de Valencia', 'evento', NULL, 0, 0);
