# 🔧 Guía de Debugging - Sistema de Rutas

## Cómo Ver Qué Está Pasando

### Abrir Consola del Navegador

**Windows/Linux:**
- Pulsa `F12` o `Ctrl + Shift + I`

**Mac:**
- Pulsa `Cmd + Option + I`

---

## 📋 Logs Disponibles

Cuando calculas una ruta, verás en la consola:

```javascript
Ruta hacia Falla del Centro
Distancia: 1.25 km
Duración: 15 min
Modo: 🚶 A PIE
```

O si es en coche:

```javascript
Ruta hacia Falla del Centro
Distancia: 1.25 km
Duración: 8 min
Modo: 🚗 COCHE
```

---

## 🚨 Errores Comunes y Soluciones

### Error: "No se pudo obtener tu ubicación"

**Causa:** Geolocalización deshabilitada o usuario dijo "No"

**Solución:**
1. En navegador Chrome: Settings → Privacy → Site Settings → Location
2. Encuentra "localhost" en la lista
3. Cambia a "Allow"
4. Recarga la página

**Alternativa:**
- Usa el botón "📍 Localizar" en la app (al lado de los filtros)
- Este también te pide permiso de geolocalización

---

### Error: "No se pudo calcular la ruta"

**Causa 1:** OSRM no está disponible
- Verifica que tienes conexión a internet
- Espera un minuto (OSRM puede estar sobrecargado)
- Intenta con otra falla

**Causa 2:** Coordenadas inválidas
- La falla podría no tener coordenadas en la BD
- Comprueba en consola que las coordenadas existen

**Causa 3:** OSRM rechaza la ruta
- Puede pasar si los puntos están demasiado lejos
- O si el routing engine no encuentra camino

---

### Error: "Fetch failed" o "CORS error"

**Causa:** Problema de conectividad con OSRM

**Solución:**
1. Verifica que tienes internet
2. Abre en otra pestaña: `https://router.project-osrm.org/`
3. Si eso carga, el problema es en otra parte
4. Si no carga, OSRM está down, espera o implementa fallback local

---

## 🎯 Verificación Técnica

### Test 1: ¿Existe el botón de ruta?

En consola, ejecuta:
```javascript
console.log(document.getElementById("sheetRoute"));
```

**Esperado:** Elemento HTML `<a>` o `<button>`  
**Si sale `null`:** El elemento no existe en el HTML

---

### Test 2: ¿Se almacenan coordenadas?

Abre una falla, luego en consola ejecuta:
```javascript
const btn = document.getElementById("sheetRoute");
console.log({
  lat: btn.dataset.routeLatitude,
  lng: btn.dataset.routeLongitude,
  name: btn.dataset.routeName
});
```

**Esperado:**
```javascript
{lat: "39.4699", lng: "-0.3763", name: "Falla del Centro"}
```

**Si faltan datos:** Revisa `openFalla()` en app-map.js

---

### Test 3: ¿Existe ubicación del usuario?

En consola, ejecuta (después de aceptar geolocalización):
```javascript
// Primero necesitas acceder al objeto state
// Como está dentro de una IIFE, usa este trick:
window.FALLES_APP_DEBUG = true;
```

Luego pulsa "Iniciar ruta" y verifica que en consola ves:
```
Ruta hacia [nombre]
Distancia: X km
Duración: Y min
```

---

### Test 4: ¿Se dibuja la ruta?

Después de calcular una ruta, en consola:
```javascript
// Verifica que existe la capa de ruta
const mapContainer = document.getElementById("fallaMap");
console.log(mapContainer.childNodes.length);
// Debe haber múltiples elementos SVG/canvas
```

O visualmente: **Debe haber una línea azul en el mapa**

---

## 🔍 Debugging Avanzado

### Agregar console.logs personalizados

En `public/assets/js/app-map.js`, busca `calculateRoute()` y agrega:

```javascript
async function calculateRoute(startLat, startLng, endLat, endLng, profile = 'foot') {
    console.log("🔄 Calculando ruta...", {startLat, startLng, endLat, endLng, profile});
    
    try {
        // Validar coordenadas
        if (!Number.isFinite(startLat) || !Number.isFinite(startLng) || 
            !Number.isFinite(endLat) || !Number.isFinite(endLng)) {
            console.error("❌ Coordenadas inválidas:", {startLat, startLng, endLat, endLng});
            return null;
        }
        
        // ... resto del código ...
```

### Ver requests a OSRM

1. Abre DevTools (F12)
2. Ve a la pestaña "Network"
3. Filtra por "router.project-osrm.org"
4. Pulsa "Iniciar ruta"
5. Deberías ver:
   - **URL**: `https://router.project-osrm.org/route/v1/foot/...`
   - **Status**: `200` (éxito) o `404` (error)
   - **Response**: JSON con `"code":"Ok"` y la geometría

### Inspeccionar respuesta OSRM

En "Network", haz click en la request, ve a "Response", deberías ver:

```json
{
  "code": "Ok",
  "routes": [
    {
      "distance": 1250.5,
      "duration": 900.2,
      "geometry": {
        "coordinates": [[-0.3763, 39.4699], [-0.3755, 39.4705], ...]
      }
    }
  ]
}
```

Si ves `"code": "NoRoute"`: No hay ruta disponible entre esos puntos

---

## 🎨 Modificar Estilos de Ruta

### Cambiar color de la ruta

En `drawRoute()`, busca:
```javascript
state.routeLine = L.polyline(routeData.coordinates, {
    color: color,
    weight: 5,
    opacity: 0.8,
    className: 'falla-route-line'
}).addTo(state.map);
```

Cambia `color: color` a:
```javascript
color: '#FF5733',  // Rojo
// o
color: '#00b300',  // Verde
// o
color: '#FFB300',  // Naranja
```

### Cambiar grosor de la línea

Cambia `weight: 5` a:
```javascript
weight: 3,   // Más fina
weight: 8,   // Más gruesa
```

### Cambiar transparencia

Cambia `opacity: 0.8` a:
```javascript
opacity: 0.5,  // Más transparente
opacity: 1.0,  // Totalmente opaco
```

---

## 📊 Exportar Datos de Ruta

Para guardar/exportar los datos de la ruta calculada:

En consola, después de calcular ruta:
```javascript
// Copia esto en la consola:
const route = {
  distance: document.getElementById("sheetRoute").textContent,
  timestamp: new Date().toISOString()
};
console.log(JSON.stringify(route, null, 2));
// Copia el output para guardar/analizar
```

---

## 🚀 Mejoras de Performance

### Si las rutas son lentas:

1. **Reduce precisión de ruta**

En `calculateRoute()`, agrega parámetro `steps=false`:
```javascript
const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${startLng},${startLat};${endLng},${endLat}?overview=simplified&geometries=geojson`;
```

Esto reduce el tamaño de datos y velocidad.

2. **Cache de rutas**

Si quieres cachear rutas frecuentes, agrega:
```javascript
const routeCache = {};

async function calculateRouteWithCache(start, end, profile) {
    const key = `${start.lat},${start.lng},${end.lat},${end.lng},${profile}`;
    if (routeCache[key]) {
        console.log("📦 Ruta en cache");
        return routeCache[key];
    }
    const result = await calculateRoute(...);
    routeCache[key] = result;
    return result;
}
```

---

## 🆘 Reportar Bugs

Si encuentras un bug, incluye:

1. **Consola Error** (copia del error exacto)
2. **Network tab** (la request a OSRM)
3. **Pasos para reproducir**
4. **Navegador/versión**
5. **Sistema operativo**

**Ejemplo:**
```
Bug: Ruta no aparece en iPhone
Navegador: Safari 14.1 en iOS 14.6
Pasos: 
1. Abrir app en iPhone
2. Permitir geolocalización
3. Abisr falla
4. Pulsar "Iniciar ruta"
Esperado: Ruta azul en mapa
Actual: Botón muestra distancia pero no hay línea
Consola: (ningún error)
Network: Request a OSRM retorna 200 con geometría válida
```

---

## 📞 Contacto y Soporte

Para más ayuda:
1. Abre DevTools (F12)
2. Ve a Console tab
3. Busca errores rojo
4. Nota el error exacto y línea
5. Revisa este documento para ese error

Si no encuentras solución:
- Verifica que estás usando un navegador moderno
- Intenta con otra falla
- Limpia cache y recarga (Ctrl+Shift+R)
- Verifica que OSRM está disponible

---

**Última actualización:** 30 de Abril de 2026  
**Versión:** 1.0
