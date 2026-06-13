# 🧪 Test Checklist - Sistema de Rutas Falles360

## ✅ Pre-Test

- [ ] Navegador moderno (Chrome, Firefox, Edge, Safari)
- [ ] Geolocalización habilitada en el navegador
- [ ] Conexión a internet estable
- [ ] JavaScript habilitado
- [ ] Consola de desarrollador abierta (F12) para ver errores

---

## 🎯 Test 1: Apertura de Falla y Botón de Ruta

**Pasos:**
1. Abre la app Falles360 en `http://localhost/fallasgo/falles360`
2. Pulsa en cualquier marcador de falla en el mapa
3. Observa que se abre el panel lateral derecho

**Resultado Esperado:**
- ✅ Panel lateral muestra información de la falla
- ✅ Existe un botón "Iniciar ruta" o con ícono de localización
- ✅ El botón tiene un atributo `title` que dice "Calcula y muestra una ruta real en el mapa"

**Si falla:**
- Verifica que el elemento con `id="sheetRoute"` existe en el HTML
- Revisa la consola para errores JavaScript

---

## 🚀 Test 2: Cálculo de Ruta Básica

**Pasos:**
1. Abre una falla en el panel lateral
2. Pulsa el botón "Iniciar ruta"
3. Si el navegador lo pide, **acepta el permiso de geolocalización**
4. Espera 2-3 segundos a que se calcule la ruta

**Resultado Esperado:**
- ✅ El botón cambia a "Calculando ruta..." (breve momento)
- ✅ El botón muestra distancia y duración (ej: "📍 1.25 km • 15 min")
- ✅ Una línea azul aparece en el mapa conectando tu posición con la falla
- ✅ El mapa ajusta automáticamente el zoom para ver toda la ruta
- ✅ No hay errores en la consola (F12)

**Si falla:**
- Abre la consola (F12) para ver el error exacto
- Verifica que tu navegador tiene geolocalización habilitada
- Prueba con otra falla
- Si el error es de OSRM, intenta en unos minutos (puede estar lento)

---

## 🔄 Test 3: Cambio de Falla

**Pasos:**
1. Con una ruta ya dibujada, abre una **falla diferente**
2. Pulsa "Iniciar ruta" nuevamente

**Resultado Esperado:**
- ✅ La ruta anterior desaparece del mapa
- ✅ Una nueva ruta se dibuja hacia la nueva falla
- ✅ El botón muestra distancia/duración actualizadas
- ✅ Funcionamiento suave sin parpadeos

**Si falla:**
- La ruta antigua se ve traslapada = revisar limpieza de capas en `drawRoute()`
- Ruta no cambia = revisar event listener en `openFalla()`

---

## 📱 Test 4: Responsividad

**Pasos (en móvil o con navegador redimensionado):**
1. Abre la app en un móvil o reduce el navegador a <640px
2. Abre una falla
3. Pulsa "Iniciar ruta"

**Resultado Esperado:**
- ✅ Ruta se dibuja correctamente en pantalla pequeña
- ✅ El botón es clickeable y sin problemas
- ✅ El mapa responde correctamente al zoom
- ✅ Sin errores de layout o CSS

**Si falla:**
- Revisa que Leaflet se redimensiona bien
- Verifica breakpoints de CSS

---

## 🚫 Test 5: Sin Geolocalización

**Pasos:**
1. En navegador, deshabilita geolocalización (Configuración del navegador)
2. Limpia cache y recarga la app
3. Abre una falla
4. Pulsa "Iniciar ruta"

**Resultado Esperado:**
- ✅ Aparece una alerta: "No se pudo obtener tu ubicación..."
- ✅ El botón vuelve a estado normal ("Iniciar ruta")
- ✅ No hay ruta dibujada en el mapa
- ✅ La app continúa funcionando

**Si falla:**
- La alerta no aparece = revisar `initiateRoute()` error handling
- App se congela = hay un problema en async/await

---

## 🌐 Test 6: OSRM Offline

**Pasos:**
1. Desactiva internet temporalmente (o bloquea OSRM en Network)
2. Abre una falla
3. Pulsa "Iniciar ruta"

**Resultado Esperado:**
- ✅ Alerta aparece: "No se pudo calcular la ruta..."
- ✅ El botón vuelve a "Iniciar ruta"
- ✅ No hay ruta dibujada
- ✅ Consola muestra error de fetch

**Si falla:**
- La app se congela = timeout de OSRM muy largo
- Múltiples intentos de reconexión = add retry logic

---

## 🎨 Test 7: Estilos y Visualización

**Pasos:**
1. Dibuja una ruta
2. Comprueba visualmente

**Resultado Esperado:**
- ✅ Línea azul clara y visible
- ✅ Grosor de línea proporcional (5px)
- ✅ Color contrasta con el mapa (azul #2f67b1)
- ✅ Línea no tapa marcadores importantes
- ✅ Se ve bien en tema de día y noche

**Si falla:**
- Línea muy fina = aumentar weight en `drawRoute()` a 6-7px
- Color no contrasta = cambiar color en hex
- Tapa todo = agregar zIndexOffset a polyline

---

## 🧭 Test 8: Diferentes Modos de Transporte

**Pasos:**
1. Abre una falla
2. Pulsa "Iniciar ruta" (por defecto a pie)
3. Observa la distancia/duración
4. (Futuro) Si hay selector de modo, cambia a coche
5. Observa que la ruta cambia

**Resultado Esperado:**
- ✅ Ruta a pie vs coche es **notoriamente diferente**
- ✅ Distancia a coche es similar o menor
- ✅ Tiempo a coche es **significativamente menor**
- ✅ Ambas rutas siguen calles reales

**Ejemplo esperado:**
- A pie: 1.50 km • 18 min
- Coche: 1.50 km • 8 min (más directo por carreteras)

**Si falla:**
- Rutas idénticas = revisar OSRM profile parameter
- Distancias muy diferentes = normal, OSRM optimiza cada ruta

---

## 🔍 Test 9: Consola de Errores

**Pasos:**
1. Abre F12 (Consola)
2. Limpia la consola
3. Dibuja una ruta completa
4. Revisa que NO hay errores rojo

**Resultado Esperado:**
- ✅ Consola limpia o solo warnings normales
- ✅ Logs info de ruta calculada
- ✅ Sin `Uncaught Error`
- ✅ Sin `TypeError` o `ReferenceError`

**Si ves errores:**
- Nota el error exacto
- Revisa línea del error en DevTools
- Verifica que el código está correctamente indentado

---

## 🎯 Test 10: Preservación de Funcionalidades

**Pasos:**
Después de todo lo anterior, verifica que NADA se rompió:

1. **Mapa base**: ¿Se ve el mapa OpenStreetMap?
   - [ ] Sí

2. **Marcadores**: ¿Aparecen todos los marcadores de fallas?
   - [ ] Sí, en posiciones correctas

3. **Filtros**: ¿Funcionan los filtros (categoría, sección)?
   - [ ] Sí, los marcadores se ocultan/muestran

4. **Búsqueda**: ¿Funciona el buscador de fallas?
   - [ ] Sí, filtra resultados

5. **Panel lateral**: ¿Se abre/cierra correctamente?
   - [ ] Sí, sin glitches

6. **Favoritos**: ¿Se pueden guardar/quitar favoritos?
   - [ ] Sí, el botón de favorito responde

7. **Mapa de calor**: ¿Se muestra si está habilitado?
   - [ ] Sí (si está en la app)

8. **Zoom**: ¿Funcionan botones de zoom?
   - [ ] Sí, +/- responden

9. **Geolocalización "Cerca de ti"**: ¿Funciona sin ruta?
   - [ ] Sí, sin conflictos

10. **Panel inferior**: ¿Se ve correctamente?
    - [ ] Sí, sin overlays con ruta

---

## 📊 Resultados

**Total de Tests:** 10  
**Pasos:** ~60  
**Tiempo estimado:** 20-30 minutos

Marca como completado cada test según los resultados.

---

## 🐛 Reporte de Errores

Si encuentras un error, documenta:

1. **Descripción clara** del problema
2. **Pasos para reproducirlo**
3. **Resultado esperado vs actual**
4. **Navegador y versión**
5. **Error en consola** (copiar el texto completo)
6. **Screenshot** (si es visual)

**Ejemplo de buen reporte:**
```
Test 2 falla en iPhone 12 con Safari 14:
- Abrí falla "Falla del Centro"
- Pulso "Iniciar ruta"
- Acepto geolocalización
- El botón dice "Calculando ruta..." 
- ERROR: Después de 10 segundos muestra "No se pudo calcular"
- En consola: "fetch failed (TypeError: undefined is not a function)"
- Esperaba: Ruta dibujada en mapa
```

---

**Fecha de prueba:** ________________  
**Tester:** ________________  
**Navegador:** ________________  
**Resultado:** ✅ APROBADO / ⚠️ CON OBSERVACIONES / ❌ FALLA
