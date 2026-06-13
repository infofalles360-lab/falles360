<?php
declare(strict_types=1);

function gamification_timezone(): DateTimeZone
{
    static $timezone;

    if ($timezone instanceof DateTimeZone) {
        return $timezone;
    }

    $timezone = new DateTimeZone('Europe/Madrid');

    return $timezone;
}

function gamification_default_visit_radius_meters(): int
{
    return 80;
}

function gamification_xp_values(): array
{
    return [
        'falla_visit' => 20,
        'prized_falla_visit' => 30,
        'infantile_falla_visit' => 15,
        'route_completed' => 50,
        'badge_unlock' => 40,
        'content_view' => 5,
        'favorite_added' => 3,
    ];
}

function gamification_xp_value(string $eventType): int
{
    $values = gamification_xp_values();

    return (int) ($values[$eventType] ?? 0);
}

function gamification_level_definitions(): array
{
    return [
        ['number' => 1, 'name' => 'Curioso', 'min_xp' => 0],
        ['number' => 2, 'name' => 'Visitante', 'min_xp' => 120],
        ['number' => 3, 'name' => 'Explorador', 'min_xp' => 280],
        ['number' => 4, 'name' => 'Fallero de Ruta', 'min_xp' => 520],
        ['number' => 5, 'name' => 'Maestro Fallero', 'min_xp' => 860],
        ['number' => 6, 'name' => 'Leyenda 360', 'min_xp' => 1300],
    ];
}

function gamification_level_for_xp(int $xpTotal): array
{
    $levels = gamification_level_definitions();
    $current = $levels[0];
    $next = null;

    foreach ($levels as $index => $level) {
        if ($xpTotal >= (int) $level['min_xp']) {
            $current = $level;
            $next = $levels[$index + 1] ?? null;
            continue;
        }

        $next = $level;
        break;
    }

    $currentMinXp = (int) $current['min_xp'];
    $nextMinXp = $next !== null ? (int) $next['min_xp'] : null;
    $progressPercent = 100.0;

    if ($nextMinXp !== null && $nextMinXp > $currentMinXp) {
        $progressPercent = (($xpTotal - $currentMinXp) / ($nextMinXp - $currentMinXp)) * 100;
    }

    return [
        'number' => (int) $current['number'],
        'name' => (string) $current['name'],
        'min_xp' => $currentMinXp,
        'next_xp' => $nextMinXp,
        'progress_percent' => max(0.0, min(100.0, round($progressPercent, 2))),
    ];
}

function gamification_badge_definitions(): array
{
    return [
        [
            'name' => 'Primera Falla',
            'slug' => 'primera-falla',
            'description' => 'Primer sello del pasaporte fallero tras visitar tu primera falla.',
            'category' => 'descubrimiento',
            'rarity' => 'common',
            'icon_path' => 'img/Primera Falla alegre emoji.png',
            'unlock_condition_text' => 'Visitar 1 falla.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'distinct_visited_fallas', 'operator' => '>=', 'value' => 1],
            'sort_order' => 10,
        ],
        [
            'name' => 'Explorador de Barrio',
            'slug' => 'explorador-de-barrio',
            'description' => 'Demuestra profundidad de exploración dentro de un mismo barrio.',
            'category' => 'descubrimiento',
            'rarity' => 'common',
            'icon_path' => 'img/Explorador de barrio y fallas.png',
            'unlock_condition_text' => 'Visitar 3 fallas en un mismo barrio.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'max_same_neighborhood_visits', 'operator' => '>=', 'value' => 3],
            'sort_order' => 20,
        ],
        [
            'name' => 'Ruta Completada',
            'slug' => 'ruta-completada',
            'description' => 'El pasaporte registra tu primera ruta cerrada dentro de la app.',
            'category' => 'recorrido',
            'rarity' => 'special',
            'icon_path' => 'img/Ruta acompañada de llamas y banderas.png',
            'unlock_condition_text' => 'Completar 1 ruta de la app.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'completed_routes', 'operator' => '>=', 'value' => 1],
            'sort_order' => 30,
        ],
        [
            'name' => 'Cazador de Premios',
            'slug' => 'cazador-de-premios',
            'description' => 'Tu recorrido ya toca monumentos distinguidos por jurado.',
            'category' => 'fallas destacadas',
            'rarity' => 'special',
            'icon_path' => 'img/Trofeo y medalla de campeón.png',
            'unlock_condition_text' => 'Visitar 3 fallas premiadas.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'visited_prized_fallas', 'operator' => '>=', 'value' => 3],
            'sort_order' => 40,
        ],
        [
            'name' => 'Especialista Infantil',
            'slug' => 'especialista-infantil',
            'description' => 'Colección centrada en fallas infantiles y su circuito propio.',
            'category' => 'fallas destacadas',
            'rarity' => 'special',
            'icon_path' => 'img/Emblema colorido de especialista infantil.png',
            'unlock_condition_text' => 'Visitar 5 fallas infantiles.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'visited_infantile_fallas', 'operator' => '>=', 'value' => 5],
            'sort_order' => 50,
        ],
        [
            'name' => 'Sección Especial',
            'slug' => 'seccion-especial',
            'description' => 'Has cubierto varias piezas de la sección más seguida del circuito.',
            'category' => 'fallas destacadas',
            'rarity' => 'epic',
            'icon_path' => 'img/Escudo y corona de la sección especial.png',
            'unlock_condition_text' => 'Visitar 3 fallas de sección especial.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'visited_special_section_fallas', 'operator' => '>=', 'value' => 3],
            'sort_order' => 60,
        ],
        [
            'name' => 'Nocturno Fallero',
            'slug' => 'nocturno-fallero',
            'description' => 'Tu exploración también vive en la franja nocturna de la fiesta.',
            'category' => 'experiencia fallera',
            'rarity' => 'special',
            'icon_path' => 'img/Fiesta de Fallas en calendario.png',
            'unlock_condition_text' => 'Visitar 3 fallas entre las 20:00 y las 02:00.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'night_visits', 'operator' => '>=', 'value' => 3],
            'sort_order' => 70,
        ],
        [
            'name' => 'Maratón Fallero',
            'slug' => 'maraton-fallero',
            'description' => 'Un solo día con ritmo de coleccionista serio.',
            'category' => 'recorrido',
            'rarity' => 'epic',
            'icon_path' => 'img/Maratón Fallero en acción.png',
            'unlock_condition_text' => 'Visitar 10 fallas en un mismo día.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'max_same_day_visits', 'operator' => '>=', 'value' => 10],
            'sort_order' => 80,
        ],
        [
            'name' => 'Tradición Viva',
            'slug' => 'tradicion-viva',
            'description' => 'También exploras el relato cultural, no solo el mapa.',
            'category' => 'experiencia fallera',
            'rarity' => 'special',
            'icon_path' => 'img/Tradición y cultura fallera.png',
            'unlock_condition_text' => 'Abrir y leer 5 fichas culturales o históricas completas.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'completed_content_reads', 'operator' => '>=', 'value' => 5],
            'sort_order' => 90,
        ],
        [
            'name' => 'Coleccionista 360',
            'slug' => 'coleccionista-360',
            'description' => 'Tu selección personal ya empieza a tener volumen real.',
            'category' => 'descubrimiento',
            'rarity' => 'epic',
            'icon_path' => 'img/Colección de Fallas 360.png',
            'unlock_condition_text' => 'Guardar 15 fallas en favoritos.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'favorite_fallas_count', 'operator' => '>=', 'value' => 15],
            'sort_order' => 100,
        ],
        [
            'name' => 'Conquistador del Centro',
            'slug' => 'conquistador-del-centro',
            'description' => 'Has cerrado una zona emblemática del centro fallero.',
            'category' => 'descubrimiento',
            'rarity' => 'special',
            'icon_path' => 'img/Conquista del corazón de Valencia.png',
            'unlock_condition_text' => 'Completar una zona emblemática del centro.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'completed_emblematic_zones', 'operator' => '>=', 'value' => 1],
            'sort_order' => 110,
        ],
        [
            'name' => 'En Ruta',
            'slug' => 'en-ruta',
            'description' => 'Tu uso práctico de la navegación ya forma parte del progreso.',
            'category' => 'recorrido',
            'rarity' => 'common',
            'icon_path' => 'img/En ruta con destino a la aventura.png',
            'unlock_condition_text' => 'Usar navegación o "cómo llegar" 5 veces.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'navigation_uses', 'operator' => '>=', 'value' => 5],
            'sort_order' => 120,
        ],
        [
            'name' => 'Fallero Constante',
            'slug' => 'fallero-constante',
            'description' => 'Vuelves varios días y el progreso se nota en la ciudad.',
            'category' => 'experiencia fallera',
            'rarity' => 'epic',
            'icon_path' => 'img/Fiesta de Fallas en calendario.png',
            'unlock_condition_text' => 'Usar la app 3 días distintos durante Fallas y visitar al menos 2 fallas cada día.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'consistent_fallas_days', 'operator' => '>=', 'value' => 3],
            'sort_order' => 130,
        ],
        [
            'name' => 'Maestro de la Plantà',
            'slug' => 'maestro-de-la-planta',
            'description' => 'Presencia real en una de las jornadas más relevantes del calendario.',
            'category' => 'experiencia fallera',
            'rarity' => 'legendary',
            'icon_path' => 'img/Maestro de la Plantà en creación.png',
            'unlock_condition_text' => 'Visitar 5 fallas durante el día de la Plantà.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'planta_day_visits', 'operator' => '>=', 'value' => 5],
            'sort_order' => 140,
        ],
        [
            'name' => 'Leyenda 360',
            'slug' => 'leyenda-360',
            'description' => 'Colección consolidada de alto nivel dentro de Fallas 360.',
            'category' => 'experiencia fallera',
            'rarity' => 'legendary',
            'icon_path' => 'img/Trofeo Leyenda 360 con insignias.png',
            'unlock_condition_text' => 'Desbloquear 10 insignias distintas.',
            'rule_key' => 'metric_threshold',
            'rule_config' => ['metric' => 'unlocked_badges_count', 'operator' => '>=', 'value' => 10],
            'sort_order' => 150,
        ],
    ];
}

function gamification_route_definitions(): array
{
    return [
        [
            'name' => 'Ruta Centro Especial',
            'slug' => 'ruta-centro-especial',
            'description' => 'Recorrido de tres paradas emblemáticas del centro histórico y su entorno inmediato.',
            'category' => 'centro',
            'min_completion_percentage' => 100.0,
            'sort_order' => 10,
            'falla_slugs' => [
                'convent-de-jerusalem-matematic-marzal',
                'na-jordana',
                'placa-del-pilar',
            ],
        ],
        [
            'name' => 'Ruta Russafa Premium',
            'slug' => 'ruta-russafa-premium',
            'description' => 'Selección compacta de fallas destacadas dentro del eje de Russafa.',
            'category' => 'barrio',
            'min_completion_percentage' => 100.0,
            'sort_order' => 20,
            'falla_slugs' => [
                'sueca-literat-azorin',
                'a-regne-de-valencia-duc-de-calabria',
                'cuba-literat-azorin',
            ],
        ],
        [
            'name' => 'Ruta Premios Especial 2026',
            'slug' => 'ruta-premios-especial-2026',
            'description' => 'Cinco hitos premiados para una ruta de alto valor coleccionable.',
            'category' => 'premios',
            'min_completion_percentage' => 100.0,
            'sort_order' => 30,
            'falla_slugs' => [
                'convent-de-jerusalem-matematic-marzal',
                'monestir-de-poblet-aparicio-albinana',
                'na-jordana',
                'placa-del-pilar',
                'sueca-literat-azorin',
            ],
        ],
    ];
}

function gamification_zone_definitions(): array
{
    return [
        [
            'name' => 'Centro Emblemático',
            'slug' => 'centro-emblematico',
            'description' => 'Zona curada del centro fallero para el logro Conquistador del Centro.',
            'is_emblematic' => true,
            'sort_order' => 10,
            'falla_slugs' => [
                'convent-de-jerusalem-matematic-marzal',
                'na-jordana',
                'placa-del-pilar',
            ],
        ],
        [
            'name' => 'Russafa Destacada',
            'slug' => 'russafa-destacada',
            'description' => 'Microzona pensada para seguimiento de progreso y exploración urbana.',
            'is_emblematic' => false,
            'sort_order' => 20,
            'falla_slugs' => [
                'sueca-literat-azorin',
                'a-regne-de-valencia-duc-de-calabria',
                'cuba-literat-azorin',
            ],
        ],
    ];
}

function gamification_fallas_event_window(int $year): array
{
    return [
        'start' => sprintf('%04d-03-15', $year),
        'end' => sprintf('%04d-03-19', $year),
        'planta' => sprintf('%04d-03-15', $year),
    ];
}
