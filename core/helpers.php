<?php
declare(strict_types=1);

function h(string|null|int|float $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function panel_copy(array $messages): string
{
    $language = function_exists('current_language') ? current_language() : 'es';

    return (string) ($messages[$language] ?? $messages['es'] ?? reset($messages) ?: '');
}

function dashboard_asset_url(string $path): string
{
    return './public/assets/' . ltrim($path, '/');
}

function dashboard_access_context(array $user): string
{
    if (($user['type'] ?? 'guest') === 'guest') {
        return 'guest';
    }

    $role = strtolower((string) ($user['role'] ?? 'user'));

    return in_array($role, ['admin', 'support'], true) ? 'admin' : 'commission';
}

function dashboard_role_label(array $user): string
{
    $access = dashboard_access_context($user);

    return match ($access) {
        'admin' => 'Admin / soporte',
        'commission' => 'Usuario comision',
        default => 'Invitado',
    };
}

function dashboard_initials(string $name): string
{
    $trimmed = trim($name);

    if ($trimmed === '') {
        return 'F';
    }

    $parts = preg_split('/\s+/', $trimmed) ?: [];
    $initials = '';

    foreach (array_slice($parts, 0, 2) as $part) {
        $initials .= strtoupper(substr($part, 0, 1));
    }

    return $initials !== '' ? $initials : 'F';
}

function dashboard_url(string $section = 'home', array $params = []): string
{
    return with_lang(app_url('dashboard_url'), array_merge(['section' => $section], $params));
}

function dashboard_logout_url(): string
{
    return with_lang('./logout.php');
}

function dashboard_home_url(): string
{
    return with_lang(app_url('home_url'));
}

function dashboard_sections(string $access): array
{
    $sections = [
        'home' => [
            'icon' => 'home',
            'label' => 'Dashboard',
            'hint' => 'Resumen general y modulos visuales',
            'roles' => ['admin', 'commission', 'guest'],
        ],
        'users' => [
            'icon' => 'users',
            'label' => 'Usuarios',
            'hint' => 'Accesos, estados y control de cuentas',
            'roles' => ['admin'],
        ],
        'commissions' => [
            'icon' => 'building',
            'label' => $access === 'commission' ? 'Mi comision' : 'Comisiones',
            'hint' => $access === 'commission' ? 'Ficha privada y estado operativo' : 'Comisiones activas, codigos y barrios',
            'roles' => ['admin', 'commission'],
        ],
        'fallas' => [
            'icon' => 'flame',
            'label' => 'Fallas',
            'hint' => 'Monumentos, artistas, categorias y premios',
            'roles' => ['admin', 'commission'],
        ],
        'events' => [
            'icon' => 'calendar',
            'label' => 'Eventos',
            'hint' => 'Agenda, horarios y destacados',
            'roles' => ['admin', 'commission'],
        ],
        'alerts' => [
            'icon' => 'bell',
            'label' => 'Alertas',
            'hint' => 'Avisos, incidencias y ventanas activas',
            'roles' => ['admin', 'commission'],
        ],
        'logs' => [
            'icon' => 'shield',
            'label' => 'Accesos y logs',
            'hint' => 'Sesiones, trazas y actividad reciente',
            'roles' => ['admin'],
        ],
        'profile' => [
            'icon' => 'user',
            'label' => 'Perfil',
            'hint' => 'Datos personales y sesiones',
            'roles' => ['admin', 'commission', 'guest'],
        ],
        'settings' => [
            'icon' => 'settings',
            'label' => 'Ajustes',
            'hint' => 'Preferencias, panel y despliegue',
            'roles' => ['admin', 'commission', 'guest'],
        ],
    ];

    $visible = [];

    foreach ($sections as $key => $section) {
        if (in_array($access, $section['roles'], true)) {
            $visible[$key] = $section;
        }
    }

    return $visible;
}

function dashboard_allowed_sections(string $access): array
{
    return array_keys(dashboard_sections($access));
}

function resolve_dashboard_section(?string $section, string $access): string
{
    $requested = is_string($section) && $section !== '' ? strtolower(trim($section)) : 'home';
    $allowed = dashboard_allowed_sections($access);

    return in_array($requested, $allowed, true) ? $requested : ($allowed[0] ?? 'home');
}

function dashboard_page_meta(string $section, string $access): array
{
    return match ($section) {
        'home' => match ($access) {
            'admin' => [
                'eyebrow' => 'Centro de control',
                'title' => 'Dashboard premium del ecosistema Fallas',
                'description' => 'Una home pensada como producto: estadisticas claras, agenda visual, mapa tipo app y actividad del sistema en una sola superficie.',
            ],
            'commission' => [
                'eyebrow' => 'Panel de comision',
                'title' => 'Gestion privada con look de app moderna',
                'description' => 'Tu espacio operativo para publicar, revisar agenda, controlar alertas y mantener la presencia de la comision desde una interfaz mobile-first.',
            ],
            default => [
                'eyebrow' => 'Modo app publica',
                'title' => 'Explora las Fallas como si fuera una app',
                'description' => 'Ruta visual, proximos actos, favoritos y personalizacion en un formato pensado primero para movil.',
            ],
        },
        'users' => [
            'eyebrow' => 'Gestion de usuarios',
            'title' => 'Accesos, roles y control operativo',
            'description' => 'Vista preparada para administrar usuarios, revisar estados y lanzar altas o bloqueos desde un flujo limpio.',
        ],
        'commissions' => [
            'eyebrow' => $access === 'commission' ? 'Mi comision' : 'Gestion de comisiones',
            'title' => $access === 'commission' ? 'Ficha operativa de tu comision' : 'Comisiones, barrios y presencia publica',
            'description' => $access === 'commission'
                ? 'Resumen privado para mantener identidad, ubicacion y estado de publicacion de la comision.'
                : 'Panel de altas y seguimiento de comisiones con estructura preparada para crecer.',
        ],
        'fallas' => [
            'eyebrow' => 'Gestion de fallas',
            'title' => 'Monumentos, artistas y geolocalizacion',
            'description' => 'Controla la informacion de las fallas con una estructura preparada para fichas ricas, premios, imagen y mapa.',
        ],
        'events' => [
            'eyebrow' => 'Agenda y programacion',
            'title' => 'Eventos con jerarquia visual y trazabilidad',
            'description' => 'Calendario editorial pensado para actos, horarios, ubicaciones y destacados sin caer en una tabla plana.',
        ],
        'alerts' => [
            'eyebrow' => 'Sistema de avisos',
            'title' => 'Alertas activas y ventanas de comunicacion',
            'description' => 'Gestiona avisos generales, incidencias, mensajes urgentes y asociaciones a falla o evento.',
        ],
        'logs' => [
            'eyebrow' => 'Observabilidad',
            'title' => 'Sesiones, accesos y actividad del sistema',
            'description' => 'Una vista clara para soporte con sesiones abiertas, ultimas conexiones, historial y senales de incidencia.',
        ],
        'profile' => [
            'eyebrow' => 'Cuenta',
            'title' => 'Perfil, seguridad y presencia personal',
            'description' => 'Gestiona tu identidad visible, sesiones abiertas y ajustes personales desde un entorno coherente con la app.',
        ],
        'settings' => [
            'eyebrow' => 'Configuracion',
            'title' => 'Ajustes del panel y del producto',
            'description' => 'Preferencias, experiencia, despliegue y lineas base para una plataforma de Fallas preparada para escalar.',
        ],
        default => [
            'eyebrow' => 'Dashboard',
            'title' => 'Panel Falles360',
            'description' => 'Centro de control del proyecto.',
        ],
    };
}

function dashboard_search_placeholder(string $section, string $access): string
{
    return match ($section) {
        'users' => 'Buscar usuarios, emails o roles',
        'commissions' => $access === 'commission' ? 'Buscar datos de tu comision' : 'Buscar comisiones, barrios o presidentes',
        'fallas' => 'Buscar fallas, artistas o barrios',
        'events' => 'Buscar actos, ubicaciones o categorias',
        'alerts' => 'Buscar alertas, tipos o destinos',
        'logs' => 'Buscar trazas, IP o acciones',
        default => $access === 'guest' ? 'Buscar fallas, actos o favoritos' : 'Buscar modulos, contenidos o actividad',
    };
}

function dashboard_topbar_chips(string $access): array
{
    return match ($access) {
        'admin' => ['Sistema', 'Agenda', 'Mapa'],
        'commission' => ['Comision', 'Agenda', 'Alertas'],
        default => ['Ruta', 'Agenda', 'Favoritos'],
    };
}

function dashboard_badge_tone(string $value): string
{
    $normalized = strtolower(trim($value));
    $map = [
        'active' => 'success',
        'activo' => 'success',
        'scheduled' => 'success',
        'destacado' => 'accent',
        'featured' => 'accent',
        'admin' => 'accent',
        'urgent' => 'danger',
        'urgente' => 'danger',
        'blocked' => 'danger',
        'bloqueado' => 'danger',
        'cancelled' => 'danger',
        'cancelado' => 'danger',
        'principal' => 'accent',
        'experimental' => 'warning',
        'infantil' => 'soft',
        'guest' => 'soft',
        'invitado' => 'soft',
        'user' => 'neutral',
        'usuario' => 'neutral',
        'commission' => 'neutral',
        'comision' => 'neutral',
        'warning' => 'warning',
        'info' => 'soft',
    ];

    return $map[$normalized] ?? 'neutral';
}

function dashboard_format_date(?string $value, string $fallback = 'Sin fecha'): string
{
    if ($value === null || trim($value) === '') {
        return $fallback;
    }

    $timestamp = strtotime($value);
    /*

        return dashboard_format_date(date('Y-m-d', $timestamp)) . ' · ' . date('H:i', $timestamp);
    }
    */
    if ($timestamp === false) {
        return $fallback;
    }

    $months = [
        1 => 'ene',
        2 => 'feb',
        3 => 'mar',
        4 => 'abr',
        5 => 'may',
        6 => 'jun',
        7 => 'jul',
        8 => 'ago',
        9 => 'sep',
        10 => 'oct',
        11 => 'nov',
        12 => 'dic',
    ];

    return sprintf(
        '%02d %s %04d',
        (int) date('d', $timestamp),
        $months[(int) date('n', $timestamp)] ?? date('M', $timestamp),
        (int) date('Y', $timestamp)
    );
}

function dashboard_format_datetime(?string $value, string $fallback = 'Sin registro'): string
{
    if ($value === null || trim($value) === '') {
        return $fallback;
    }

    $timestamp = strtotime($value);
    if ($timestamp) {
        return dashboard_format_date(date('Y-m-d', $timestamp)) . ' · ' . date('H:i', $timestamp);
    }

    return $timestamp ? date('d M · H:i', $timestamp) : $fallback;
}

function dashboard_format_time_range(?string $startTime, ?string $endTime, string $fallback = 'Horario pendiente'): string
{
    $start = trim((string) $startTime);
    $end = trim((string) $endTime);

    if ($start === '' && $end === '') {
        return $fallback;
    }

    if ($start !== '' && $end !== '') {
        return substr($start, 0, 5) . ' - ' . substr($end, 0, 5);
    }

    $single = $start !== '' ? $start : $end;

    return substr($single, 0, 5);
}

function dashboard_agenda_display_date(?string $date, ?string $startTime = null): string
{
    $normalizedDate = trim((string) $date);

    if ($normalizedDate === '') {
        return '';
    }

    $timestamp = strtotime($normalizedDate . ' 00:00:00');
    if ($timestamp === false) {
        return '';
    }

    $normalizedTime = trim((string) $startTime);
    if ($normalizedTime !== '') {
        $minutes = ((int) substr($normalizedTime, 0, 2) * 60) + (int) substr($normalizedTime, 3, 2);
        if ($minutes <= 299) {
            $timestamp = strtotime('-1 day', $timestamp);
        }
    }

    return date('Y-m-d', $timestamp);
}

function dashboard_agenda_day_meta(?string $date): array
{
    $normalizedDate = trim((string) $date);

    if ($normalizedDate === '') {
        return [
            'date_iso' => '',
            'day_number' => '--',
            'month_short' => '---',
            'weekday_short' => '--',
            'weekday_long' => 'Sin fecha',
            'label_long' => 'Sin fecha',
        ];
    }

    $timestamp = strtotime($normalizedDate . ' 00:00:00');
    if ($timestamp === false) {
        return [
            'date_iso' => '',
            'day_number' => '--',
            'month_short' => '---',
            'weekday_short' => '--',
            'weekday_long' => 'Sin fecha',
            'label_long' => 'Sin fecha',
        ];
    }

    $weekdaysShort = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
    $weekdaysLong = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    $monthsShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    $monthsLong = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre',
    ];

    $weekdayIndex = (int) date('w', $timestamp);
    $monthIndex = (int) date('n', $timestamp) - 1;
    $dayNumber = (int) date('j', $timestamp);

    return [
        'date_iso' => date('Y-m-d', $timestamp),
        'day_number' => str_pad((string) $dayNumber, 2, '0', STR_PAD_LEFT),
        'month_short' => $monthsShort[$monthIndex] ?? date('M', $timestamp),
        'weekday_short' => $weekdaysShort[$weekdayIndex] ?? '--',
        'weekday_long' => $weekdaysLong[$weekdayIndex] ?? 'Sin fecha',
        'label_long' => ($weekdaysLong[$weekdayIndex] ?? 'Sin fecha') . ' ' . $dayNumber . ' de ' . ($monthsLong[$monthIndex] ?? ''),
    ];
}

function dashboard_group_agenda(array $events): array
{
    $groups = [];

    foreach ($events as $event) {
        $dateIso = (string) ($event['display_date_iso'] ?? $event['date_iso'] ?? '');
        $meta = dashboard_agenda_day_meta($dateIso);
        $groupKey = $meta['date_iso'] !== '' ? $meta['date_iso'] : '__unknown__';

        if (!isset($groups[$groupKey])) {
            $groups[$groupKey] = [
                'date_iso' => $meta['date_iso'],
                'day_number' => $meta['day_number'],
                'month_short' => $meta['month_short'],
                'weekday_short' => $meta['weekday_short'],
                'weekday_long' => $meta['weekday_long'],
                'label_long' => $meta['label_long'],
                'item_count' => 0,
                'items' => [],
            ];
        }

        $groups[$groupKey]['items'][] = $event;
        $groups[$groupKey]['item_count']++;
    }

    return array_values($groups);
}

function dashboard_icon(string $name): string
{
    $icons = [
        'home' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h5v-5h4v5h5v-9.5"/></svg>',
        'users' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 19a4 4 0 0 0-8 0"/><circle cx="12" cy="9" r="3.2"/><path d="M20 19a3 3 0 0 0-3-3"/><path d="M18 8.7a2.7 2.7 0 1 0 0-5.4"/></svg>',
        'building' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V20"/><path d="M14 8h4.5A1.5 1.5 0 0 1 20 9.5V20"/><path d="M8 8h2M8 12h2M8 16h2M16 12h2M16 16h2"/></svg>',
        'flame' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1.5 3 5 4.8 5 9a5 5 0 0 1-10 0c0-2.4 1.2-4 2.6-5.5.5 1.9 1.5 3.1 2.4 3.8C13.6 8.6 13 5.8 12 3Z"/><path d="M12 14.5c.8 1 1.4 1.8 1.4 3A2.4 2.4 0 0 1 11 20a2.4 2.4 0 0 1-2.4-2.5c0-1.2.6-2 1.7-3"/></svg>',
        'calendar' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4M17 3v4"/><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16"/></svg>',
        'bell' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>',
        'shield' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.8 7.8 7 10 4.2-2.2 7-5.4 7-10V6l-7-3Z"/><path d="m9.5 12 1.8 1.8 3.7-4"/></svg>',
        'user' => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
        'settings' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.9.6Z"/></svg>',
        'logout' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8V4H5v16h9v-4"/><path d="M10 12h11"/><path d="m17 7 4 5-4 5"/></svg>',
        'search' => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/></svg>',
        'spark' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/><path d="M5 14l.6 1.4L7 16l-1.4.6L5 18l-.6-1.4L3 16l1.4-.6L5 14Z"/></svg>',
        'map' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z"/><path d="M9 4v14M15 6v14"/></svg>',
        'star' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.2 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>',
        'filter' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>',
        'compass' => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.3 6.2-6.2 2.3 2.3-6.2 6.2-2.3Z"/></svg>',
    ];

    return $icons[$name] ?? $icons['spark'];
}

function dashboard_resource_definition(string $section, string $access): array
{
    return match ($section) {
        'users' => [
            'columns' => ['Usuario', 'Username', 'Tipo', 'Rol', 'Estado', 'Comision', 'Alta', 'Ultimo acceso'],
            'filters' => ['Todos', 'Activos', 'Bloqueados', 'Admins'],
            'empty_title' => 'Todavia no hay usuarios cargados',
            'empty_copy' => 'El modulo ya esta preparado para altas, bloqueos y busqueda. Cuando entren nuevos usuarios apareceran aqui.',
            'composer_title' => 'Crear usuario',
            'composer_copy' => 'Formulario base preparado para integrar alta, edicion, bloqueo y control por rol.',
            'form_sections' => [
                [
                    'title' => 'Identidad',
                    'fields' => [
                        ['label' => 'Nombre visible', 'type' => 'text', 'placeholder' => 'Ej. Paula Sanchis'],
                        ['label' => 'Username', 'type' => 'text', 'placeholder' => 'paula.sanchis'],
                        ['label' => 'Email', 'type' => 'email', 'placeholder' => 'paula@email.com'],
                    ],
                ],
                [
                    'title' => 'Permisos',
                    'fields' => [
                        ['label' => 'Tipo de usuario', 'type' => 'select', 'options' => ['Invitado', 'Comision', 'Admin / soporte']],
                        ['label' => 'Estado', 'type' => 'select', 'options' => ['Activo', 'Bloqueado']],
                        ['label' => 'Comision asociada', 'type' => 'text', 'placeholder' => 'Seleccionar o vincular'],
                    ],
                ],
            ],
            'highlights' => [
                'Busqueda global por email, username y rol.',
                'Estados claros para bloqueo, activacion y control de acceso.',
                'Preparado para enlazar comisiones y permisos granulares.',
            ],
        ],
        'commissions' => [
            'columns' => ['Comision', 'Slug', 'Codigo', 'Presidente', 'Barrio', 'Direccion', 'Estado'],
            'filters' => ['Todas', 'Activas', 'En pausa', 'Barrios'],
            'empty_title' => $access === 'commission' ? 'Tu comision todavia no esta enlazada' : 'Todavia no hay comisiones cargadas',
            'empty_copy' => $access === 'commission'
                ? 'El layout ya esta listo para mostrar la ficha privada. Solo falta asociar el usuario con su comision en base de datos.'
                : 'La vista ya esta preparada para altas, edicion y activacion de comisiones por barrio.',
            'composer_title' => $access === 'commission' ? 'Editar mi comision' : 'Crear comision',
            'composer_copy' => 'Formulario modular para datos de identidad, ubicacion y estado operativo.',
            'form_sections' => [
                [
                    'title' => 'Datos base',
                    'fields' => [
                        ['label' => 'Nombre', 'type' => 'text', 'placeholder' => 'Falla Mercado Central'],
                        ['label' => 'Slug', 'type' => 'text', 'placeholder' => 'falla-mercado-central'],
                        ['label' => 'Codigo interno', 'type' => 'text', 'placeholder' => 'FM-001'],
                    ],
                ],
                [
                    'title' => 'Localizacion',
                    'fields' => [
                        ['label' => 'Presidente', 'type' => 'text', 'placeholder' => 'Nombre del responsable'],
                        ['label' => 'Barrio', 'type' => 'text', 'placeholder' => 'Ruzafa'],
                        ['label' => 'Direccion', 'type' => 'text', 'placeholder' => 'Calle y numero'],
                        ['label' => 'Estado', 'type' => 'select', 'options' => ['Activa', 'En pausa']],
                    ],
                ],
            ],
            'highlights' => [
                'Ficha lista para presidentes, codigo interno y barrio.',
                'Base solida para relacionar fallas, eventos y accesos.',
                'Pensado para vista admin y tambien para panel reducido de comision.',
            ],
        ],
        'fallas' => [
            'columns' => ['Falla', 'Categoria', 'Seccion', 'Comision', 'Artista', 'Ano', 'Premio', 'Estado'],
            'filters' => ['Todas', 'Principal', 'Infantil', 'Experimental'],
            'empty_title' => 'Todavia no hay monumentos registrados',
            'empty_copy' => 'La vista ya esta lista para operar con mapas, premios, artistas e imagen principal de cada falla.',
            'composer_title' => 'Nueva falla',
            'composer_copy' => 'Editor pensado para ficha rica, geolocalizacion y contexto de exposicion.',
            'form_sections' => [
                [
                    'title' => 'Ficha principal',
                    'fields' => [
                        ['label' => 'Nombre', 'type' => 'text', 'placeholder' => 'Falla Principal Ayuntamiento'],
                        ['label' => 'Slug', 'type' => 'text', 'placeholder' => 'falla-ayuntamiento'],
                        ['label' => 'Categoria', 'type' => 'select', 'options' => ['principal', 'infantil', 'experimental']],
                        ['label' => 'Seccion', 'type' => 'text', 'placeholder' => 'Especial'],
                    ],
                ],
                [
                    'title' => 'Contexto y ubicacion',
                    'fields' => [
                        ['label' => 'Comision', 'type' => 'text', 'placeholder' => 'Nombre de la comision'],
                        ['label' => 'Artista', 'type' => 'text', 'placeholder' => 'Artista fallero'],
                        ['label' => 'Ano', 'type' => 'number', 'placeholder' => '2026'],
                        ['label' => 'Premio', 'type' => 'text', 'placeholder' => 'Seccion especial'],
                        ['label' => 'Direccion', 'type' => 'text', 'placeholder' => 'Plaza o calle'],
                        ['label' => 'Barrio', 'type' => 'text', 'placeholder' => 'Ciutat Vella'],
                    ],
                ],
                [
                    'title' => 'Descripcion',
                    'fields' => [
                        ['label' => 'Descripcion', 'type' => 'textarea', 'rows' => 4, 'placeholder' => 'Concepto, tema, recorrido o notas destacadas.'],
                    ],
                ],
            ],
            'highlights' => [
                'Categorias obligatorias: principal, infantil y experimental.',
                'Preparado para imagen, premio, coordenadas y ficha extensa.',
                'Compatible con vista mapa y modulo app publica.',
            ],
        ],
        'events' => [
            'columns' => ['Evento', 'Categoria', 'Fecha', 'Horario', 'Ubicacion', 'Direccion', 'Destacado', 'Estado'],
            'filters' => ['Todos', 'Hoy', 'Programados', 'Destacados'],
            'empty_title' => 'Todavia no hay eventos cargados',
            'empty_copy' => 'El modulo de agenda ya esta preparado para sincronizar actos, ubicaciones y estados con una experiencia muy visual.',
            'composer_title' => 'Nuevo evento',
            'composer_copy' => 'Formulario limpio para programacion, tiempos, ubicacion y marcado visual.',
            'form_sections' => [
                [
                    'title' => 'Contenido',
                    'fields' => [
                        ['label' => 'Categoria de evento', 'type' => 'text', 'placeholder' => 'Mascleta, plantà, ofrenda...'],
                        ['label' => 'Falla asociada', 'type' => 'text', 'placeholder' => 'Selecciona una falla'],
                        ['label' => 'Titulo', 'type' => 'text', 'placeholder' => 'Mascleta central'],
                        ['label' => 'Descripcion', 'type' => 'textarea', 'rows' => 3, 'placeholder' => 'Descripcion corta del acto'],
                    ],
                ],
                [
                    'title' => 'Planificacion',
                    'fields' => [
                        ['label' => 'Fecha', 'type' => 'date'],
                        ['label' => 'Hora inicio', 'type' => 'time'],
                        ['label' => 'Hora fin', 'type' => 'time'],
                        ['label' => 'Ubicacion', 'type' => 'text', 'placeholder' => 'Plaza del Ayuntamiento'],
                        ['label' => 'Direccion', 'type' => 'text', 'placeholder' => 'Direccion completa'],
                        ['label' => 'Destacado', 'type' => 'select', 'options' => ['No', 'Si']],
                        ['label' => 'Estado', 'type' => 'select', 'options' => ['scheduled', 'cancelled', 'finished']],
                    ],
                ],
            ],
            'highlights' => [
                'Agenda visual lista para home, app publica y panel privado.',
                'Campos de tiempo y ubicacion pensados para mapa y alertas.',
                'Compatible con destacados y prioridad editorial.',
            ],
        ],
        'alerts' => [
            'columns' => ['Alerta', 'Tipo', 'Destino', 'Asociacion', 'Inicio', 'Fin', 'Estado'],
            'filters' => ['Todas', 'Info', 'Warning', 'Urgente'],
            'empty_title' => 'Todavia no hay alertas activas',
            'empty_copy' => 'La estructura ya soporta alertas generales o asociadas a falla o evento con ventana temporal.',
            'composer_title' => 'Nueva alerta',
            'composer_copy' => 'Editor preparado para mensajes operativos, urgencias y avisos publicos.',
            'form_sections' => [
                [
                    'title' => 'Mensaje',
                    'fields' => [
                        ['label' => 'Titulo', 'type' => 'text', 'placeholder' => 'Corte de calle temporal'],
                        ['label' => 'Mensaje', 'type' => 'textarea', 'rows' => 4, 'placeholder' => 'Describe la incidencia o aviso'],
                        ['label' => 'Tipo', 'type' => 'select', 'options' => ['info', 'warning', 'urgent']],
                    ],
                ],
                [
                    'title' => 'Destino y ventana',
                    'fields' => [
                        ['label' => 'Destino', 'type' => 'select', 'options' => ['general', 'falla', 'event']],
                        ['label' => 'Falla o evento asociado', 'type' => 'text', 'placeholder' => 'Referencia opcional'],
                        ['label' => 'Fecha inicio', 'type' => 'date'],
                        ['label' => 'Fecha fin', 'type' => 'date'],
                        ['label' => 'Estado', 'type' => 'select', 'options' => ['Activo', 'Pausado']],
                    ],
                ],
            ],
            'highlights' => [
                'Mensajes generales, por falla o por evento.',
                'Listo para banners, notificaciones y estados criticos.',
                'Pensado para destino, ventana y severidad visibles.',
            ],
        ],
        default => [],
    };
}
