-- Permisos de editor privado para Falles360.
-- Ejecuta esto una vez y sustituye el email por tu usuario administrador si es distinto.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

UPDATE users
SET role = 'admin'
WHERE email = 'marcbaixaulifigueres@gmail.com';
