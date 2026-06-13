# Falles360

Falles360 es una app web para Fallas con frontend Vite/React y backend PHP. Este repositorio contiene la app principal y su codigo fuente.

La whitelist publica se mantiene por separado en otro repo:
- `infofalles360-lab/fallas360-whitelist`

## Que incluye

- Landing y app principal en `src/` y `dist/`
- Backend PHP en `api/`, `backend/`, `config/`, `core/` y `dashboard/`
- Pagina de whitelist integrada en `whitelist.html` y `whitelist.php`
- Integraciones opcionales con Telegram, SMTP y sincronizacion de contenido

## Que no funciona out of the box

- El bot de Telegram no funcionara sin credenciales reales de servidor
- El envio SMTP no funcionara sin credenciales propias
- Las rutas PHP requieren un entorno tipo XAMPP/Apache/PHP
- La whitelist estatica publica para GitHub Pages vive en su repo separado

## Requisitos

- Node.js 20+
- npm
- PHP 8+
- MySQL o MariaDB
- XAMPP o un stack equivalente si quieres probar el backend completo

## Puesta en marcha

1. Instala dependencias del frontend:
   `npm install`
2. Copia `.env.example` a tu archivo local de entorno y rellena solo lo que necesites para probar backend y bot.
3. Arranca el frontend:
   `npm run dev`
4. Si quieres usar backend PHP, sirve esta carpeta desde Apache/XAMPP.

## Scripts utiles

- `npm run dev`
- `npm run build`
- `npm run build:whitelist-pages`
- `npm run lint`

## Whitelist

La app principal conserva su propia whitelist, pero la version publica preparada para GitHub Pages se publica aparte para no mezclar el despliegue estatico con el repositorio completo.

Documentacion relacionada:
- `WHITELIST_STATIC_SETUP.md`

## Seguridad

- No subas `.env.local` ni credenciales reales
- Rota cualquier secreto que haya estado en un archivo local antes de publicar
- Revisa especialmente tokens de Telegram, SMTP y credenciales de base de datos
