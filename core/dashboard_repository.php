<?php
declare(strict_types=1);

function dashboard_fetch_all(string $sql, array $params = []): array
{
    try {
        $statement = db()->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll() ?: [];
    } catch (Throwable $exception) {
        return [];
    }
}

function dashboard_fetch_row(string $sql, array $params = []): ?array
{
    $rows = dashboard_fetch_all($sql, $params);

    return $rows[0] ?? null;
}

function dashboard_fetch_value(string $sql, array $params = []): int
{
    $row = dashboard_fetch_row($sql, $params);

    if ($row === null) {
        return 0;
    }

    return (int) array_values($row)[0];
}

function dashboard_username_from_email(?string $email): string
{
    if ($email === null || trim($email) === '') {
        return 'sin-usuario';
    }

    $username = strstr($email, '@', true);

    return $username !== false ? $username : $email;
}

function dashboard_global_snapshot(): array
{
    $urgentAlerts = dashboard_fetch_value(
        'SELECT COUNT(*) FROM alerts WHERE is_active = 1 AND alert_type = :alert_type',
        ['alert_type' => 'urgent']
    );
    $blockedUsers = dashboard_fetch_value('SELECT COUNT(*) FROM users WHERE status = :status', ['status' => 'blocked']);
    $pendingContent = dashboard_fetch_value("SELECT COUNT(*) FROM fallas WHERE COALESCE(image_url, '') = ''")
        + dashboard_fetch_value("SELECT COUNT(*) FROM events WHERE COALESCE(location_name, '') = ''");

    return [
        'users_total' => dashboard_fetch_value('SELECT COUNT(*) FROM users'),
        'guest_accesses' => dashboard_fetch_value(
            'SELECT COUNT(*) FROM access_logs WHERE action_type = :action_type',
            ['action_type' => 'guest_access']
        ),
        'commissions_active' => dashboard_fetch_value(
            'SELECT COUNT(*) FROM commissions WHERE status = :status',
            ['status' => 'active']
        ),
        'fallas_total' => dashboard_fetch_value('SELECT COUNT(*) FROM fallas'),
        'events_active' => dashboard_fetch_value(
            'SELECT COUNT(*) FROM events WHERE status = :status',
            ['status' => 'scheduled']
        ),
        'alerts_active' => dashboard_fetch_value(
            'SELECT COUNT(*) FROM alerts WHERE is_active = 1 AND (ends_at IS NULL OR ends_at >= NOW())'
        ),
        'sessions_open' => dashboard_fetch_value(
            'SELECT COUNT(*) FROM user_sessions WHERE revoked_at IS NULL AND expires_at >= NOW()'
        ),
        'incidents' => $urgentAlerts + $blockedUsers,
        'pending_content' => $pendingContent,
        'urgent_alerts' => $urgentAlerts,
    ];
}

function dashboard_recent_activity_feed(): array
{
    $items = [];

    foreach (dashboard_fetch_all('SELECT name, email, created_at FROM users ORDER BY created_at DESC LIMIT 4') as $row) {
        $items[] = [
            'title' => $row['name'],
            'copy' => 'Nuevo usuario registrado: ' . ($row['email'] ?: 'sin email'),
            'time' => (string) $row['created_at'],
            'label' => 'Usuario',
            'icon' => 'users',
        ];
    }

    foreach (dashboard_fetch_all('SELECT title, created_at FROM events ORDER BY created_at DESC LIMIT 4') as $row) {
        $items[] = [
            'title' => $row['title'],
            'copy' => 'Evento anadido a la agenda del sistema.',
            'time' => (string) $row['created_at'],
            'label' => 'Evento',
            'icon' => 'calendar',
        ];
    }

    foreach (dashboard_fetch_all('SELECT title, created_at FROM alerts ORDER BY created_at DESC LIMIT 4') as $row) {
        $items[] = [
            'title' => $row['title'],
            'copy' => 'Alerta creada o actualizada para el panel.',
            'time' => (string) $row['created_at'],
            'label' => 'Aviso',
            'icon' => 'bell',
        ];
    }

    foreach (dashboard_fetch_all(
        'SELECT access_logs.action_type, access_logs.details, access_logs.created_at, users.name
         FROM access_logs
         LEFT JOIN users ON users.id = access_logs.user_id
         ORDER BY access_logs.created_at DESC
         LIMIT 6'
    ) as $row) {
        $items[] = [
            'title' => $row['name'] ?: 'Sistema',
            'copy' => $row['details'] ?: ('Accion registrada: ' . $row['action_type']),
            'time' => (string) $row['created_at'],
            'label' => 'Log',
            'icon' => 'shield',
        ];
    }

    usort(
        $items,
        static fn (array $left, array $right): int => strcmp((string) $right['time'], (string) $left['time'])
    );

    $items = array_slice($items, 0, 8);

    if ($items !== []) {
        return $items;
    }

    return [
        [
            'title' => 'Base conectada',
            'copy' => 'El dashboard esta enlazado a MySQL y listo para empezar a recibir actividad real.',
            'time' => date('Y-m-d H:i:s'),
            'label' => 'Preview',
            'icon' => 'spark',
        ],
        [
            'title' => 'Panel modular',
            'copy' => 'La estructura ya separa shell, vistas y datos para crecer sin rehacer el panel.',
            'time' => date('Y-m-d H:i:s', strtotime('-15 minutes')),
            'label' => 'Sistema',
            'icon' => 'home',
        ],
    ];
}

function dashboard_upcoming_events(): array
{
    $rows = dashboard_fetch_all(
        'SELECT events.title, events.event_date, events.start_time, events.end_time, events.location_name,
                events.is_featured, events.status, event_categories.name AS category_name
         FROM events
         LEFT JOIN event_categories ON event_categories.id = events.category_id
         WHERE events.status = :status
         ORDER BY events.event_date ASC, COALESCE(events.start_time, "00:00:00") ASC',
        ['status' => 'scheduled']
    );

    if ($rows !== []) {
        return array_map(
            static function (array $row): array {
                $dateIso = (string) ($row['event_date'] ?? '');
                $startTime = (string) ($row['start_time'] ?? '');
                $endTime = (string) ($row['end_time'] ?? '');
                $displayDateIso = dashboard_agenda_display_date($dateIso, $startTime);
                $displayDateMeta = dashboard_agenda_day_meta($displayDateIso);

                return [
                    'title' => $row['title'],
                    'category' => $row['category_name'] ?: 'Agenda',
                    'date' => dashboard_format_date($dateIso),
                    'date_iso' => $dateIso,
                    'display_date_iso' => $displayDateIso,
                    'display_date' => $displayDateMeta['label_long'],
                    'day_number' => $displayDateMeta['day_number'],
                    'month_short' => $displayDateMeta['month_short'],
                    'weekday_short' => $displayDateMeta['weekday_short'],
                    'time' => dashboard_format_time_range($startTime, $endTime),
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'location' => $row['location_name'] ?: 'Ubicacion pendiente',
                    'priority' => (int) $row['is_featured'] === 1 ? 'Destacado' : 'Programado',
                    'tone' => (int) $row['is_featured'] === 1 ? 'accent' : 'soft',
                ];
            },
            $rows
        );
    }

    return [
        [
            'title' => 'Mascleta central',
            'category' => 'Pirotecnia',
            'date' => '19 mar 2026',
            'date_iso' => '2026-03-19',
            'display_date_iso' => '2026-03-19',
            'display_date' => 'Jueves 19 de marzo',
            'day_number' => '19',
            'month_short' => 'mar',
            'weekday_short' => 'jue',
            'time' => '14:00 - 14:25',
            'start_time' => '14:00:00',
            'end_time' => '14:25:00',
            'location' => 'Plaza del Ayuntamiento',
            'priority' => 'Preview',
            'tone' => 'accent',
        ],
        [
            'title' => 'Ruta de fallas infantiles',
            'category' => 'Ruta guiada',
            'date' => '19 mar 2026',
            'date_iso' => '2026-03-19',
            'display_date_iso' => '2026-03-19',
            'display_date' => 'Jueves 19 de marzo',
            'day_number' => '19',
            'month_short' => 'mar',
            'weekday_short' => 'jue',
            'time' => '17:30 - 19:00',
            'start_time' => '17:30:00',
            'end_time' => '19:00:00',
            'location' => 'Ciutat Vella',
            'priority' => 'Sugerido',
            'tone' => 'soft',
        ],
        [
            'title' => 'Crema final',
            'category' => 'Acto principal',
            'date' => '19 mar 2026',
            'date_iso' => '2026-03-19',
            'display_date_iso' => '2026-03-19',
            'display_date' => 'Jueves 19 de marzo',
            'day_number' => '19',
            'month_short' => 'mar',
            'weekday_short' => 'jue',
            'time' => '23:30 - 01:00',
            'start_time' => '23:30:00',
            'end_time' => '01:00:00',
            'location' => 'Recorrido oficial',
            'priority' => 'Alta',
            'tone' => 'warning',
        ],
    ];
}

function dashboard_map_position(float $latitude, float $longitude): array
{
    $minLat = 39.4300;
    $maxLat = 39.4900;
    $minLng = -0.4100;
    $maxLng = -0.3450;

    $x = (($longitude - $minLng) / ($maxLng - $minLng)) * 100;
    $y = (1 - (($latitude - $minLat) / ($maxLat - $minLat))) * 100;

    return [
        'x' => max(10, min(90, $x)),
        'y' => max(12, min(88, $y)),
    ];
}

function dashboard_map_points(): array
{
    $rows = dashboard_fetch_all(
        '(SELECT name AS title, latitude, longitude, "falla" AS kind, commission_name AS meta
          FROM fallas
          WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          LIMIT 4)
         UNION ALL
         (SELECT title, latitude, longitude, "evento" AS kind, location_name AS meta
          FROM events
          WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          LIMIT 4)'
    );

    $points = [];

    foreach ($rows as $row) {
        $position = dashboard_map_position((float) $row['latitude'], (float) $row['longitude']);
        $points[] = [
            'title' => $row['title'],
            'meta' => $row['meta'] ?: ucfirst((string) $row['kind']),
            'kind' => $row['kind'],
            'x' => $position['x'],
            'y' => $position['y'],
        ];
    }

    if ($points !== []) {
        return array_slice($points, 0, 6);
    }

    return [
        ['title' => 'Ayuntamiento', 'meta' => 'Preview mapa', 'kind' => 'falla', 'x' => 56, 'y' => 38],
        ['title' => 'Ruzafa', 'meta' => 'Comision activa', 'kind' => 'falla', 'x' => 64, 'y' => 56],
        ['title' => 'El Carmen', 'meta' => 'Agenda noche', 'kind' => 'evento', 'x' => 42, 'y' => 34],
        ['title' => 'Jardin del Turia', 'meta' => 'Ruta familiar', 'kind' => 'evento', 'x' => 34, 'y' => 62],
    ];
}

function dashboard_featured_commissions(): array
{
    $rows = dashboard_fetch_all(
        'SELECT name, neighborhood, president_name, status
         FROM commissions
         ORDER BY created_at DESC
         LIMIT 3'
    );

    if ($rows !== []) {
        return array_map(
            static fn (array $row): array => [
                'name' => $row['name'],
                'meta' => ($row['neighborhood'] ?: 'Barrio por definir') . ' · ' . ($row['president_name'] ?: 'Presidencia pendiente'),
                'status' => $row['status'] ?: 'active',
            ],
            $rows
        );
    }

    return [
        ['name' => 'Ruta Centro Historico', 'meta' => 'Preview de modulo · Ciutat Vella', 'status' => 'active'],
        ['name' => 'Foco familiar', 'meta' => 'Selecciones para infantil y accesos faciles', 'status' => 'active'],
        ['name' => 'Noche fallera', 'meta' => 'Agenda nocturna y puntos calientes', 'status' => 'active'],
    ];
}

function dashboard_admin_home_context(array $user): array
{
    $snapshot = dashboard_global_snapshot();

    return [
        'showcase' => [
            'title' => 'Falles 2026',
            'subtitle' => 'Centro de control premium',
            'meta' => 'Sistema / Agenda / Soporte',
            'cta' => 'Ver',
            'app_title' => 'Falles Control',
            'app_subtitle' => 'Premium Operations Guide',
            'app_meta' => '11 modulos activos',
            'right_title' => 'Mis modulos',
            'right_subtitle' => 'Mapa, agenda y soporte',
            'story_cards' => [
                [
                    'title' => 'No pierdas contexto',
                    'copy' => 'Accede a usuarios, eventos y avisos desde una vista rapida.',
                    'variant' => 'map',
                ],
                [
                    'title' => 'Localiza la actividad',
                    'copy' => 'Mapa y agenda conectados para seguir el pulso del sistema.',
                    'variant' => 'duo',
                ],
                [
                    'title' => 'Gestion con claridad',
                    'copy' => 'Cada modulo se presenta como una pantalla de producto real.',
                    'variant' => 'detail',
                ],
            ],
        ],
        'hero_stats' => [
            ['label' => 'Usuarios activos', 'value' => (string) max(1, $snapshot['users_total']), 'icon' => 'users'],
            ['label' => 'Sesiones abiertas', 'value' => (string) $snapshot['sessions_open'], 'icon' => 'shield'],
            ['label' => 'Alertas urgentes', 'value' => (string) $snapshot['urgent_alerts'], 'icon' => 'bell'],
        ],
        'kpis' => [
            ['label' => 'Total usuarios', 'value' => (string) $snapshot['users_total'], 'tone' => 'accent', 'icon' => 'users'],
            ['label' => 'Invitados activos', 'value' => (string) $snapshot['guest_accesses'], 'tone' => 'soft', 'icon' => 'spark'],
            ['label' => 'Comisiones activas', 'value' => (string) $snapshot['commissions_active'], 'tone' => 'default', 'icon' => 'building'],
            ['label' => 'Fallas registradas', 'value' => (string) $snapshot['fallas_total'], 'tone' => 'default', 'icon' => 'flame'],
            ['label' => 'Eventos activos', 'value' => (string) $snapshot['events_active'], 'tone' => 'soft', 'icon' => 'calendar'],
            ['label' => 'Alertas activas', 'value' => (string) $snapshot['alerts_active'], 'tone' => 'warning', 'icon' => 'bell'],
        ],
        'system_state' => [
            ['label' => 'Incidencias', 'value' => (string) $snapshot['incidents'], 'copy' => 'Urgencias y cuentas bloqueadas que requieren seguimiento.'],
            ['label' => 'Contenido pendiente', 'value' => (string) $snapshot['pending_content'], 'copy' => 'Fichas sin imagen principal o eventos sin ubicacion definida.'],
            ['label' => 'Sesiones abiertas', 'value' => (string) $snapshot['sessions_open'], 'copy' => 'Tokens vigentes y actividad reciente del panel.'],
            ['label' => 'Invitados', 'value' => (string) $snapshot['guest_accesses'], 'copy' => 'Accesos publicos registrados desde el flujo de entrada rapida.'],
        ],
        'recent_activity' => dashboard_recent_activity_feed(),
        'agenda' => dashboard_upcoming_events(),
        'map_points' => dashboard_map_points(),
        'featured' => dashboard_featured_commissions(),
        'quick_actions' => [
            ['label' => 'Crear usuario', 'href' => dashboard_url('users') . '#composer', 'icon' => 'users'],
            ['label' => 'Crear comision', 'href' => dashboard_url('commissions') . '#composer', 'icon' => 'building'],
            ['label' => 'Anadir falla', 'href' => dashboard_url('fallas') . '#composer', 'icon' => 'flame'],
            ['label' => 'Anadir evento', 'href' => dashboard_url('events') . '#composer', 'icon' => 'calendar'],
            ['label' => 'Publicar aviso', 'href' => dashboard_url('alerts') . '#composer', 'icon' => 'bell'],
        ],
        'hero_copy' => 'Panel oscuro, modular y visual para controlar usuarios, contenido, alertas y trazas sin perder el lenguaje de una app moderna.',
        'hero_user' => $user['name'] ?? 'Admin',
    ];
}

function dashboard_commission_home_context(array $user): array
{
    $snapshot = dashboard_global_snapshot();

    return [
        'showcase' => [
            'title' => 'Mi Comision',
            'subtitle' => 'Panel privado Falles360',
            'meta' => 'Agenda / Publicacion / Alertas',
            'cta' => 'Ver',
            'app_title' => 'Mis Fallas',
            'app_subtitle' => 'Panel privado de comision',
            'app_meta' => '11 actos y avisos',
            'right_title' => 'Mis Fallas',
            'right_subtitle' => 'Vista privada de comision',
            'story_cards' => [
                [
                    'title' => 'No sabes por donde seguir',
                    'copy' => 'Ten siempre visibles tus actos, alertas y puntos clave.',
                    'variant' => 'map',
                ],
                [
                    'title' => 'Localiza tus fallas',
                    'copy' => 'La experiencia conecta mapas, agenda y contenidos en un toque.',
                    'variant' => 'duo',
                ],
                [
                    'title' => 'Publica con estilo',
                    'copy' => 'Fichas, avisos y actos con un look de app movil actual.',
                    'variant' => 'detail',
                ],
            ],
        ],
        'hero_stats' => [
            ['label' => 'Eventos visibles', 'value' => (string) $snapshot['events_active'], 'icon' => 'calendar'],
            ['label' => 'Alertas vigentes', 'value' => (string) $snapshot['alerts_active'], 'icon' => 'bell'],
            ['label' => 'Sesiones activas', 'value' => (string) $snapshot['sessions_open'], 'icon' => 'shield'],
        ],
        'kpis' => [
            ['label' => 'Mi comision', 'value' => $user['name'] ?? 'Comision', 'tone' => 'accent', 'icon' => 'building'],
            ['label' => 'Fallas visibles', 'value' => (string) $snapshot['fallas_total'], 'tone' => 'default', 'icon' => 'flame'],
            ['label' => 'Agenda activa', 'value' => (string) $snapshot['events_active'], 'tone' => 'soft', 'icon' => 'calendar'],
            ['label' => 'Alertas', 'value' => (string) $snapshot['alerts_active'], 'tone' => 'warning', 'icon' => 'bell'],
        ],
        'system_state' => [
            ['label' => 'Estado de publicacion', 'value' => 'Listo', 'copy' => 'La estructura del panel ya esta preparada para contenidos, agenda y avisos.'],
            ['label' => 'Relacion comision', 'value' => 'Pendiente', 'copy' => 'El usuario demo todavia no esta vinculado a una comision concreta en base de datos.'],
            ['label' => 'Actividad reciente', 'value' => (string) count(dashboard_recent_activity_feed()), 'copy' => 'Ultimos cambios y trazas visibles desde el sistema.'],
        ],
        'recent_activity' => dashboard_recent_activity_feed(),
        'agenda' => dashboard_upcoming_events(),
        'map_points' => dashboard_map_points(),
        'featured' => dashboard_featured_commissions(),
        'quick_actions' => [
            ['label' => 'Editar comision', 'href' => dashboard_url('commissions') . '#composer', 'icon' => 'building'],
            ['label' => 'Subir falla', 'href' => dashboard_url('fallas') . '#composer', 'icon' => 'flame'],
            ['label' => 'Programar acto', 'href' => dashboard_url('events') . '#composer', 'icon' => 'calendar'],
            ['label' => 'Lanzar aviso', 'href' => dashboard_url('alerts') . '#composer', 'icon' => 'bell'],
        ],
        'hero_copy' => 'Una experiencia mas cercana a una app de gestion de comision que a un panel gris. Agenda, alertas y publicacion quedan a un toque.',
        'hero_user' => $user['name'] ?? 'Comision',
    ];
}

function dashboard_guest_home_context(array $user): array
{
    return [
        'showcase' => [
            'title' => 'Fallas 2026',
            'subtitle' => 'Ruta publica premium',
            'meta' => 'Mapa / Agenda / Favoritos',
            'cta' => 'Ver',
            'app_title' => 'Mis Fallas',
            'app_subtitle' => 'Valencia Festival Guide',
            'app_meta' => '11 favoritos y rutas',
            'right_title' => 'Mis Fallas',
            'right_subtitle' => 'Valencia festival guide',
            'story_cards' => [
                [
                    'title' => 'No sabes como ir',
                    'copy' => 'Descubre la ruta mas comoda hasta tu falla favorita.',
                    'variant' => 'map',
                ],
                [
                    'title' => 'Localiza las fallas',
                    'copy' => 'Cada icono corresponde a una seccion del recorrido.',
                    'variant' => 'duo',
                ],
                [
                    'title' => 'Quieres saber mas',
                    'copy' => 'Descubre todo sobre la falla con una ficha visual.',
                    'variant' => 'detail',
                ],
            ],
        ],
        'hero_stats' => [
            ['label' => 'Rutas destacadas', 'value' => '3', 'icon' => 'compass'],
            ['label' => 'Actos sugeridos', 'value' => (string) count(dashboard_upcoming_events()), 'icon' => 'calendar'],
            ['label' => 'Favoritos listos', 'value' => '0', 'icon' => 'star'],
        ],
        'kpis' => [
            ['label' => 'Modo invitado', 'value' => 'Activo', 'tone' => 'accent', 'icon' => 'spark'],
            ['label' => 'Agenda proxima', 'value' => 'Hoy', 'tone' => 'soft', 'icon' => 'calendar'],
            ['label' => 'Mapa rapido', 'value' => '4 puntos', 'tone' => 'default', 'icon' => 'map'],
            ['label' => 'Favoritos', 'value' => 'Sin guardar', 'tone' => 'warning', 'icon' => 'star'],
        ],
        'system_state' => [
            ['label' => 'Personaliza tu nombre', 'value' => 'Listo', 'copy' => 'La vista esta preparada para personalizar el acceso publico y evolucionar a perfil persistente.'],
            ['label' => 'Ruta visual', 'value' => 'Activa', 'copy' => 'Mapa, agenda y tarjetas grandes para una experiencia que se siente movil.'],
            ['label' => 'Siguiente paso', 'value' => 'Guardar favoritos', 'copy' => 'El panel ya deja clara la estructura para enlazar favoritos reales y alertas personalizadas.'],
        ],
        'recent_activity' => [
            [
                'title' => 'Ruta recomendada',
                'copy' => 'Centro, infantiles y cena cerca del recorrido oficial.',
                'time' => date('Y-m-d H:i:s'),
                'label' => 'Sugerencia',
                'icon' => 'compass',
            ],
            [
                'title' => 'Actos del dia',
                'copy' => 'Seleccionados para que la home parezca una app publica real.',
                'time' => date('Y-m-d H:i:s', strtotime('-10 minutes')),
                'label' => 'Agenda',
                'icon' => 'calendar',
            ],
        ],
        'agenda' => dashboard_upcoming_events(),
        'map_points' => dashboard_map_points(),
        'featured' => [
            ['name' => 'Ruta express', 'meta' => 'Centro · 3 paradas · 75 min', 'status' => 'active'],
            ['name' => 'Ruta familiar', 'meta' => 'Infantiles · sombra · accesible', 'status' => 'active'],
            ['name' => 'Ruta nocturna', 'meta' => 'Luces, ambiente y actos finales', 'status' => 'active'],
        ],
        'quick_actions' => [
            ['label' => 'Explorar agenda', 'href' => '#agenda', 'icon' => 'calendar'],
            ['label' => 'Ver mapa', 'href' => '#mapa', 'icon' => 'map'],
            ['label' => 'Abrir perfil', 'href' => dashboard_url('profile'), 'icon' => 'user'],
        ],
        'hero_copy' => 'Una home publica con lenguaje de app: bloques amplios, ritmo visual, agenda util y sensacion mobile-first desde el primer scroll.',
        'hero_user' => $user['name'] ?? 'Invitado',
    ];
}

function dashboard_home_context(string $access, array $user): array
{
    return match ($access) {
        'admin' => dashboard_admin_home_context($user),
        'commission' => dashboard_commission_home_context($user),
        default => dashboard_guest_home_context($user),
    };
}

function dashboard_resource_context(string $section, string $access, array $user): array
{
    $definition = dashboard_resource_definition($section, $access);
    $snapshot = dashboard_global_snapshot();
    $rows = [];
    $stats = [];

    switch ($section) {
        case 'users':
            foreach (dashboard_fetch_all('SELECT id, name, email, role, status, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT 12') as $row) {
                $role = strtolower((string) ($row['role'] ?: 'user'));
                $rows[] = [
                    'title' => $row['name'],
                    'subtitle' => $row['email'],
                    'cells' => [
                        ['value' => '@' . dashboard_username_from_email($row['email']), 'tone' => 'neutral'],
                        ['value' => $role === 'admin' ? 'Admin / soporte' : 'Comision', 'tone' => $role === 'admin' ? 'accent' : 'soft'],
                        ['value' => $role, 'tone' => dashboard_badge_tone($role)],
                        ['value' => $row['status'], 'tone' => dashboard_badge_tone((string) $row['status'])],
                        ['value' => 'Sin asignar', 'tone' => 'neutral'],
                        ['value' => dashboard_format_date($row['created_at'])],
                        ['value' => dashboard_format_datetime($row['last_login_at'])],
                    ],
                    'actions' => ['Editar', 'Bloquear', 'Eliminar'],
                ];
            }

            $stats = [
                ['label' => 'Total', 'value' => (string) $snapshot['users_total']],
                ['label' => 'Activos', 'value' => (string) dashboard_fetch_value('SELECT COUNT(*) FROM users WHERE status = :status', ['status' => 'active'])],
                ['label' => 'Bloqueados', 'value' => (string) dashboard_fetch_value('SELECT COUNT(*) FROM users WHERE status = :status', ['status' => 'blocked'])],
                ['label' => 'Invitados', 'value' => (string) $snapshot['guest_accesses']],
            ];
            break;

        case 'commissions':
            foreach (dashboard_fetch_all('SELECT name, slug, access_code, president_name, neighborhood, address, status FROM commissions ORDER BY created_at DESC LIMIT 10') as $row) {
                $rows[] = [
                    'title' => $row['name'],
                    'subtitle' => $row['neighborhood'] ?: 'Barrio pendiente',
                    'cells' => [
                        ['value' => $row['slug'] ?: 'sin-slug'],
                        ['value' => $row['access_code'] ?: 'sin-codigo', 'tone' => 'soft'],
                        ['value' => $row['president_name'] ?: 'Pendiente'],
                        ['value' => $row['neighborhood'] ?: 'Sin barrio'],
                        ['value' => $row['address'] ?: 'Sin direccion'],
                        ['value' => $row['status'] ?: 'active', 'tone' => dashboard_badge_tone((string) ($row['status'] ?: 'active'))],
                    ],
                    'actions' => ['Editar', 'Pausar', 'Ver'],
                ];
            }

            $stats = [
                ['label' => 'Activas', 'value' => (string) $snapshot['commissions_active']],
                ['label' => 'Barrios', 'value' => (string) dashboard_fetch_value('SELECT COUNT(DISTINCT neighborhood) FROM commissions')],
                ['label' => 'Con codigo', 'value' => (string) dashboard_fetch_value("SELECT COUNT(*) FROM commissions WHERE COALESCE(access_code, '') <> ''")],
            ];
            break;

        case 'fallas':
            foreach (dashboard_fetch_all('SELECT name, category, section_name, commission_name, artist_name, year, prize_text, status FROM fallas ORDER BY created_at DESC LIMIT 10') as $row) {
                $rows[] = [
                    'title' => $row['name'],
                    'subtitle' => $row['commission_name'] ?: 'Comision pendiente',
                    'cells' => [
                        ['value' => $row['category'] ?: 'principal', 'tone' => dashboard_badge_tone((string) ($row['category'] ?: 'principal'))],
                        ['value' => $row['section_name'] ?: 'Sin seccion'],
                        ['value' => $row['commission_name'] ?: 'Sin comision'],
                        ['value' => $row['artist_name'] ?: 'Sin artista'],
                        ['value' => (string) ($row['year'] ?: date('Y'))],
                        ['value' => $row['prize_text'] ?: 'Sin premio'],
                        ['value' => $row['status'] ?: 'active', 'tone' => dashboard_badge_tone((string) ($row['status'] ?: 'active'))],
                    ],
                    'actions' => ['Editar', 'Mapa', 'Ver'],
                ];
            }

            $stats = [
                ['label' => 'Total', 'value' => (string) $snapshot['fallas_total']],
                ['label' => 'Principal', 'value' => (string) dashboard_fetch_value('SELECT COUNT(*) FROM fallas WHERE category = :category', ['category' => 'principal'])],
                ['label' => 'Infantil', 'value' => (string) dashboard_fetch_value('SELECT COUNT(*) FROM fallas WHERE category = :category', ['category' => 'infantil'])],
                ['label' => 'Experimental', 'value' => (string) dashboard_fetch_value('SELECT COUNT(*) FROM fallas WHERE category = :category', ['category' => 'experimental'])],
            ];
            break;

        case 'events':
            foreach (dashboard_fetch_all(
                'SELECT events.title, events.event_date, events.start_time, events.end_time, events.location_name, events.address,
                        events.is_featured, events.status, event_categories.name AS category_name
                 FROM events
                 LEFT JOIN event_categories ON event_categories.id = events.category_id
                 ORDER BY events.event_date DESC, COALESCE(events.start_time, "23:59:59") DESC
                 LIMIT 10'
            ) as $row) {
                $rows[] = [
                    'title' => $row['title'],
                    'subtitle' => $row['location_name'] ?: 'Ubicacion pendiente',
                    'cells' => [
                        ['value' => $row['category_name'] ?: 'Agenda', 'tone' => 'soft'],
                        ['value' => dashboard_format_date($row['event_date'])],
                        ['value' => trim(((string) $row['start_time']) . ' - ' . ((string) $row['end_time'] ?: '--:--'))],
                        ['value' => $row['location_name'] ?: 'Sin ubicacion'],
                        ['value' => $row['address'] ?: 'Sin direccion'],
                        ['value' => (int) $row['is_featured'] === 1 ? 'Destacado' : 'Normal', 'tone' => (int) $row['is_featured'] === 1 ? 'accent' : 'neutral'],
                        ['value' => $row['status'] ?: 'scheduled', 'tone' => dashboard_badge_tone((string) ($row['status'] ?: 'scheduled'))],
                    ],
                    'actions' => ['Editar', 'Duplicar', 'Ver'],
                ];
            }

            $stats = [
                ['label' => 'Programados', 'value' => (string) $snapshot['events_active']],
                ['label' => 'Destacados', 'value' => (string) dashboard_fetch_value('SELECT COUNT(*) FROM events WHERE is_featured = 1')],
                ['label' => 'Con ubicacion', 'value' => (string) dashboard_fetch_value("SELECT COUNT(*) FROM events WHERE COALESCE(location_name, '') <> ''")],
            ];
            break;

        case 'alerts':
            foreach (dashboard_fetch_all(
                'SELECT title, alert_type, target_type, falla_id, event_id, starts_at, ends_at, is_active
                 FROM alerts
                 ORDER BY created_at DESC
                 LIMIT 10'
            ) as $row) {
                $association = 'General';
                if ((int) ($row['falla_id'] ?? 0) > 0) {
                    $association = 'Falla #' . $row['falla_id'];
                } elseif ((int) ($row['event_id'] ?? 0) > 0) {
                    $association = 'Evento #' . $row['event_id'];
                }

                $rows[] = [
                    'title' => $row['title'],
                    'subtitle' => strtoupper((string) $row['target_type']),
                    'cells' => [
                        ['value' => $row['alert_type'] ?: 'info', 'tone' => dashboard_badge_tone((string) ($row['alert_type'] ?: 'info'))],
                        ['value' => $row['target_type'] ?: 'general'],
                        ['value' => $association],
                        ['value' => dashboard_format_date($row['starts_at'])],
                        ['value' => dashboard_format_date($row['ends_at'], 'Sin fin')],
                        ['value' => (int) $row['is_active'] === 1 ? 'Activo' : 'Pausado', 'tone' => (int) $row['is_active'] === 1 ? 'success' : 'neutral'],
                    ],
                    'actions' => ['Editar', 'Pausar', 'Ver'],
                ];
            }

            $stats = [
                ['label' => 'Activas', 'value' => (string) $snapshot['alerts_active']],
                ['label' => 'Urgentes', 'value' => (string) $snapshot['urgent_alerts']],
                ['label' => 'Generales', 'value' => (string) dashboard_fetch_value('SELECT COUNT(*) FROM alerts WHERE target_type = :target', ['target' => 'general'])],
            ];
            break;
    }

    return [
        'definition' => $definition,
        'rows' => $rows,
        'stats' => $stats,
        'scope_note' => $access === 'commission'
            ? 'La capa visual y de navegacion por rol ya esta lista. Para filtrar por comision concreta solo falta enlazar el usuario con su entidad en base de datos.'
            : null,
    ];
}

function dashboard_logs_context(): array
{
    $sessions = dashboard_fetch_all(
        'SELECT user_sessions.ip_address, user_sessions.user_agent, user_sessions.expires_at, users.name
         FROM user_sessions
         LEFT JOIN users ON users.id = user_sessions.user_id
         WHERE user_sessions.revoked_at IS NULL
           AND user_sessions.expires_at >= NOW()
         ORDER BY user_sessions.created_at DESC
         LIMIT 6'
    );
    $activity = dashboard_fetch_all(
        'SELECT access_logs.action_type, access_logs.details, access_logs.ip_address, access_logs.created_at, users.name
         FROM access_logs
         LEFT JOIN users ON users.id = access_logs.user_id
         ORDER BY access_logs.created_at DESC
         LIMIT 12'
    );
    $attempts = dashboard_fetch_all(
        'SELECT email, ip_address, success, attempted_at
         FROM login_attempts
         ORDER BY attempted_at DESC
         LIMIT 8'
    );

    return [
        'session_count' => dashboard_fetch_value('SELECT COUNT(*) FROM user_sessions WHERE revoked_at IS NULL AND expires_at >= NOW()'),
        'sessions' => $sessions,
        'activity' => $activity,
        'attempts' => $attempts,
        'incidents' => [
            ['label' => 'Cuentas bloqueadas', 'value' => (string) dashboard_fetch_value('SELECT COUNT(*) FROM users WHERE status = :status', ['status' => 'blocked'])],
            ['label' => 'Alertas urgentes', 'value' => (string) dashboard_fetch_value('SELECT COUNT(*) FROM alerts WHERE is_active = 1 AND alert_type = :type', ['type' => 'urgent'])],
            ['label' => 'Intentos fallidos', 'value' => (string) dashboard_fetch_value('SELECT COUNT(*) FROM login_attempts WHERE success = 0')],
        ],
    ];
}

function dashboard_profile_context(string $access, array $user): array
{
    $userId = (int) ($user['id'] ?? 0);
    $sessions = $userId > 0
        ? dashboard_fetch_all(
            'SELECT ip_address, user_agent, expires_at, created_at
             FROM user_sessions
             WHERE user_id = :user_id
               AND revoked_at IS NULL
               AND expires_at >= NOW()
             ORDER BY created_at DESC
             LIMIT 5',
            ['user_id' => $userId]
        )
        : [];
    $activity = $userId > 0
        ? dashboard_fetch_all(
            'SELECT action_type, details, created_at, ip_address
             FROM access_logs
             WHERE user_id = :user_id
             ORDER BY created_at DESC
             LIMIT 6',
            ['user_id' => $userId]
        )
        : [];

    return [
        'account' => [
            'name' => $user['name'] ?? 'Invitado',
            'email' => $user['email'] ?? 'Sin correo',
            'role' => dashboard_role_label($user),
            'access' => strtoupper($access),
            'logged_at' => dashboard_format_datetime($user['logged_at'] ?? null),
        ],
        'sessions' => $sessions,
        'activity' => $activity,
        'panels' => [
            ['label' => 'Cuenta visible', 'value' => $access === 'guest' ? 'Publica' : 'Privada', 'copy' => 'Controla nombre, datos de cuenta y consistencia de marca personal.'],
            ['label' => 'Seguridad', 'value' => $userId > 0 ? 'Con sesiones' : 'Temporal', 'copy' => 'Historial y sesiones activas con lenguaje claro y visual.'],
            ['label' => 'Preferencias', 'value' => 'Preparadas', 'copy' => 'Estructura lista para idioma, notificaciones y cambios de contrasena.'],
        ],
    ];
}

function dashboard_settings_context(string $access, array $user): array
{
    return [
        'groups' => [
            [
                'title' => 'Experiencia',
                'copy' => 'Ajustes de panel, comportamiento mobile y preferencia de vista.',
                'items' => [
                    ['label' => 'Sidebar compacta en movil', 'state' => true],
                    ['label' => 'Destacar agenda del dia', 'state' => true],
                    ['label' => 'Usar tarjetas anchas en home', 'state' => true],
                ],
            ],
            [
                'title' => 'Notificaciones',
                'copy' => 'Base para conectar avisos, alertas y eventos destacados.',
                'items' => [
                    ['label' => 'Alertas urgentes', 'state' => true],
                    ['label' => 'Resumen diario', 'state' => $access !== 'guest'],
                    ['label' => 'Avisos de agenda', 'state' => true],
                ],
            ],
            [
                'title' => 'Sistema',
                'copy' => 'Preparado para configuracion operativa y despliegue futuro.',
                'items' => [
                    ['label' => 'Modo mantenimiento visual', 'state' => false],
                    ['label' => 'Logs ampliados de soporte', 'state' => $access === 'admin'],
                    ['label' => 'Vista publica premium', 'state' => true],
                ],
            ],
        ],
        'cards' => [
            ['title' => 'Arquitectura modular', 'copy' => 'El panel ya esta separado en config, core, views, actions y assets para crecer sin rehacerlo.'],
            ['title' => 'Conectado al login', 'copy' => 'La sesion actual entra desde el login existente y respeta idioma, logout y control de acceso.'],
            ['title' => 'Listo para CRUD real', 'copy' => 'Los formularios y pantallas ya estan maquetados para enganchar acciones PHP y endpoints propios.'],
        ],
    ];
}
