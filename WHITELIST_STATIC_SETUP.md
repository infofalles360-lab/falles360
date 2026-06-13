# Whitelist Static Setup

GitHub Pages solo sirve archivos estaticos. Eso significa:

- `whitelist.html` si puede vivir en GitHub Pages.
- La base de datos, el correo y la logica de guardado no pueden vivir en GitHub Pages.
- El formulario necesita un endpoint externo.
- Ese endpoint puede ser el mismo `api/solicitudes.php` que ya existe hoy, siempre que lo hospedes fuera de GitHub Pages.

## Archivos

- `whitelist.html`: nueva pagina estatica.
- `src/WaitlistApp.tsx`: interfaz React de la whitelist.
- `public/waitlist-config.js`: configuracion publica del endpoint.

## Ruta final

Tras `npm run build`, la pagina queda en:

- `dist/whitelist.html`

## Configuracion minima

Edita `public/waitlist-config.js` y rellena:

```js
window.FALLES360_WAITLIST = Object.assign(
  {
    endpoint: "https://tu-endpoint.com/api/waitlist",
    countEndpoint: "https://tu-endpoint.com/api/waitlist/count",
    initialCount: 0,
    payloadFormat: "json",
    source: "github_pages_whitelist",
    privacyHref: "./privacy.html",
    landingHref: "./index.html",
  },
  window.FALLES360_WAITLIST || {},
);
```

## Comportamiento por defecto

- En local o en un hosting con PHP, la whitelist intenta usar automaticamente `api/solicitudes.php`.
- En GitHub Pages debes sobrescribir `endpoint` y `countEndpoint` con una URL absoluta.

## Contrato del endpoint

La pagina envia:

```json
{
  "name": "Maria Garcia",
  "email": "maria@email.com",
  "source": "github_pages_whitelist"
}
```

Respuesta esperada:

```json
{
  "ok": true,
  "message": "Solicitud guardada y notificada por email.",
  "count": 123
}
```

## Si quieres seguir guardando en `solicitudes`

Tienes dos opciones realistas:

1. Mantener una API externa propia y que `whitelist.html` le haga `fetch`.
2. Mover el backend a una funcion serverless o servicio externo y conservar ahi la tabla `solicitudes` y el envio de email.

## Estado actual del backend

`api/solicitudes.php` ya:

- guarda en la tabla `solicitudes`,
- envia aviso a `info.falles360@gmail.com`,
- acepta `GET` para devolver el contador,
- acepta `POST` desde la whitelist estatica,
- responde con CORS para poder llamarlo desde un dominio distinto.

## Limite real

Sin un backend externo no hay forma segura de:

- insertar en una tabla SQL,
- enviar correos a `info.falles360@gmail.com`,
- evitar abuso del formulario.
