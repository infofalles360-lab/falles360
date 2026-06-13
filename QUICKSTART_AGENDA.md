# 🚀 Guía Rápida de Activación - Agenda Fallera

## En 3 pasos está lista

### 1️⃣ Ejecutar la migración

Opción A (Con PHP - Recomendado):
```bash
php backend/install_agenda_migration.php
```

Opción B (Directamente SQL):
```bash
mysql -u root fallas_app < migrations/20260501_create_agenda_events_table.sql
```

Opción C (phpMyAdmin):
1. Abre phpMyAdmin
2. Selecciona la BD `fallas_app`
3. Pestaña "SQL"
4. Copia el contenido de `migrations/20260501_create_agenda_events_table.sql`
5. Click "Ejecutar"

### 2️⃣ Probar el endpoint

Abre en el navegador (estando autenticado en la app):
```
http://localhost/falles360/api/agenda.php
```

Deberías ver JSON con los eventos. Si ves error 401, necesitas estar autenticado en la app.

### 3️⃣ Abre la app

Cuando abras la sección "Agenda" verás:
- ✅ Eventos cargados desde la BD
- ✅ Agrupados por días
- ✅ Ordenados por franja (mañana, tarde, noche)
- ✅ Con selector de fecha
- ✅ Tarjetas bonitas con información

## ✨ Archivos creados/modificados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `migrations/20260501_create_agenda_events_table.sql` | ✨ Nuevo | Script SQL de migración |
| `api/agenda.php` | ✨ Nuevo | Endpoint API autenticado |
| `backend/install_agenda_migration.php` | ✨ Nuevo | Script PHP para instalación |
| `dashboard/src/utils/publicApp.ts` | ✏️ Modificado | Función `fetchDashboardEvents()` actualizada |
| `AGENDA_IMPLEMENTATION.md` | ✨ Nuevo | Documentación completa |

## 🔍 Pruebas rápidas en MySQL

```sql
-- Ver cuántos eventos hay
SELECT COUNT(*) FROM agenda_events;

-- Ver eventos del 1 de marzo
SELECT * FROM agenda_events WHERE event_date = '2027-03-01' ORDER BY sort_datetime;

-- Ver eventos destcados (isLive)
SELECT * FROM agenda_events WHERE is_featured = 1;

-- Ver eventos por categoría
SELECT DISTINCT category FROM agenda_events;
```

## 📞 Uso del API

### Obtener todos los eventos (período por defecto)
```
GET /api/agenda.php
```

### Obtener eventos de una fecha específica
```
GET /api/agenda.php?start=2027-03-08&end=2027-03-14
```

## ⚠️ Si algo no funciona

1. ¿Ejecutaste la migración?
   ```sql
   SHOW TABLES LIKE 'agenda_events';
   ```

2. ¿Hay datos?
   ```sql
   SELECT COUNT(*) FROM agenda_events;
   ```

3. ¿Estás autenticado en la app?
   - El API requiere sesión válida

4. Revisa logs:
   - `logs/` - Errores de la aplicación

## 🎯 Lo que sucede automáticamente

Después de ejecutar la migración, la app:
1. ✅ Detecta el nuevo endpoint `/api/agenda.php`
2. ✅ Carga eventos desde la BD (no usa más datos mock)
3. ✅ Mantiene compatibilidad con `/api/events.php` como respaldo
4. ✅ Muestra la agenda perfectamente en la sección "Agenda"

## 📋 Próximos pasos (opcional)

- Editar eventos directamente en phpMyAdmin
- Agregar más eventos para años futuros
- Crear admin panel para CRUD de eventos
- Automatizar inserción de eventos desde otras fuentes

---

**¿Necesitas ayuda?** Revisa `AGENDA_IMPLEMENTATION.md` para documentación completa.
