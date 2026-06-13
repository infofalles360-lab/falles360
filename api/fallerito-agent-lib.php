<?php
declare(strict_types=1);

function fallerito_agent_tool_catalog(): array
{
    return [
        [
            'name' => 'get_user_memory',
            'label' => 'Memoria del usuario',
            'description' => 'Recupera idioma, zonas habituales y preferencias persistentes.',
        ],
        [
            'name' => 'search_fallas_catalog',
            'label' => 'Catalogo de fallas',
            'description' => 'Busca fallas, secciones, barrios, artistas y premios en datos locales.',
        ],
        [
            'name' => 'search_agenda_events',
            'label' => 'Agenda',
            'description' => 'Busca actos y eventos de la agenda oficial disponible en la app.',
        ],
        [
            'name' => 'search_marketplace',
            'label' => 'Marketplace',
            'description' => 'Consulta negocios, cupones, productos y experiencias reales.',
        ],
        [
            'name' => 'search_documents',
            'label' => 'Documentos adjuntos',
            'description' => 'Analiza los documentos o imagenes que ha subido el usuario.',
        ],
        [
            'name' => 'search_cendra_news',
            'label' => 'Cendra',
            'description' => 'Busca noticias y articulos locales indexados en la app.',
        ],
        [
            'name' => 'find_nearby_fallas',
            'label' => 'Fallas cercanas',
            'description' => 'Prioriza cercania, zona, tipo de falla y preferencias del usuario.',
        ],
        [
            'name' => 'build_fallero_plan',
            'label' => 'Planificador fallero',
            'description' => 'Construye un mini plan con fallas, actos y marketplace.',
        ],
        [
            'name' => 'transport_guidance',
            'label' => 'Guia de transporte',
            'description' => 'Da orientacion de transporte publico y movilidad en Fallas.',
        ],
        [
            'name' => 'emergency_guidance',
            'label' => 'Guia de emergencia',
            'description' => 'Da orientacion prudente para emergencias y puntos de ayuda.',
        ],
    ];
}

function fallerito_agent_empty_debug(string $mode = 'agentic-local'): array
{
    return [
        'mode' => $mode,
        'tools' => [],
        'citations' => [],
        'steps' => [],
    ];
}

function fallerito_agent_add_step(array &$debug, string $step): void
{
    $debug['steps'] = is_array($debug['steps'] ?? null) ? $debug['steps'] : [];
    $debug['steps'][] = $step;
}

function fallerito_agent_add_citation(array &$debug, string $label, string $detail): void
{
    $debug['citations'] = is_array($debug['citations'] ?? null) ? $debug['citations'] : [];
    $debug['citations'][] = [
        'label' => fallerito_string($label, 80),
        'detail' => fallerito_string($detail, 180),
    ];
}

function fallerito_agent_record_tool(array &$debug, string $name, string $label, string $status, int $durationMs, int $count = 0): void
{
    $debug['tools'] = is_array($debug['tools'] ?? null) ? $debug['tools'] : [];
    $debug['tools'][] = [
        'name' => $name,
        'label' => $label,
        'status' => $status,
        'count' => max(0, $count),
        'duration_ms' => max(0, $durationMs),
    ];
}

function fallerito_agent_append_context(array &$contextBlocks, string $title, string $content): void
{
    $trimmed = trim($content);
    if ($trimmed === '') {
        return;
    }

    $contextBlocks[] = '[' . $title . "]\n" . $trimmed;
}

function fallerito_agent_should_use_catalog(string $message, string $intent): bool
{
    $normalized = fallerito_normalize_search($message . ' ' . $intent);
    return preg_match('/\b(falla|fallas|monumento|monumentos|artista|seccion|especial|infantil|premio|barrio|ruta|visitar|ver)\b/u', $normalized) === 1;
}

function fallerito_agent_should_use_agenda(string $message, string $intent): bool
{
    $normalized = fallerito_normalize_search($message . ' ' . $intent);
    return preg_match('/\b(agenda|evento|eventos|acto|actos|horario|horarios|cuando|mascleta|ofrenda|crema|crema|castillo|castillos|noche|hoy)\b/u', $normalized) === 1;
}

function fallerito_agent_should_use_cendra(string $message, string $intent): bool
{
    $normalized = fallerito_normalize_search($message . ' ' . $intent);
    return preg_match('/\b(noticia|noticias|ultima hora|actualidad|cendra|hoy|ayer|ultima)\b/u', $normalized) === 1;
}

function fallerito_agent_run(
    array $user,
    string $message,
    string $intent,
    array $memory,
    array $documents = [],
    ?array $userPosition = null,
    ?string $zoneHint = null
): array {
    $debug = fallerito_agent_empty_debug();
    $contextBlocks = [];
    $normalized = fallerito_normalize_search($message . ' ' . $intent);

    $toolStartedAt = microtime(true);
    $memoryContext = fallerito_memory_context($memory);
    fallerito_agent_record_tool(
        $debug,
        'get_user_memory',
        'Memoria del usuario',
        $memoryContext !== '' ? 'completed' : 'empty',
        (int) round((microtime(true) - $toolStartedAt) * 1000),
        $memoryContext !== '' ? 1 : 0
    );
    if ($memoryContext !== '') {
        fallerito_agent_add_step($debug, 'He recuperado memoria persistente para personalizar la respuesta.');
        fallerito_agent_add_citation($debug, 'Memoria', $memoryContext);
        fallerito_agent_append_context($contextBlocks, 'MEMORIA', $memoryContext);
    }

    if ($documents !== []) {
        $toolStartedAt = microtime(true);
        $documentContext = fallerito_documents_context($documents);
        fallerito_agent_record_tool(
            $debug,
            'search_documents',
            'Documentos adjuntos',
            'completed',
            (int) round((microtime(true) - $toolStartedAt) * 1000),
            count($documents)
        );
        fallerito_agent_add_step($debug, 'He analizado los documentos adjuntos como fuente prioritaria.');
        foreach (array_slice($documents, 0, 3) as $document) {
            fallerito_agent_add_citation(
                $debug,
                $document['kind'] === 'image' ? 'Imagen subida' : 'Documento subido',
                (string) ($document['name'] ?? 'Documento')
            );
        }
        fallerito_agent_append_context($contextBlocks, 'DOCUMENTOS', $documentContext);
    }

    if (fallerito_agent_should_use_catalog($message, $intent)) {
        $toolStartedAt = microtime(true);
        $catalogContext = fallerito_fallas_catalog_context($user, $message);
        $bestFalla = fallerito_best_falla_match($user, $message);
        fallerito_agent_record_tool(
            $debug,
            'search_fallas_catalog',
            'Catalogo de fallas',
            trim($catalogContext) !== '' ? 'completed' : 'empty',
            (int) round((microtime(true) - $toolStartedAt) * 1000),
            $bestFalla !== null ? 1 : 0
        );
        fallerito_agent_add_step($debug, 'He consultado el catalogo de fallas para contrastar nombres, barrios y secciones.');
        if ($bestFalla !== null) {
            fallerito_agent_add_citation(
                $debug,
                'Catalogo de fallas',
                fallerito_string((string) ($bestFalla['name'] ?? 'Falla'), 140)
            );
        }
        fallerito_agent_append_context($contextBlocks, 'CATALOGO_FALLAS', $catalogContext);
    }

    if (fallerito_agent_should_use_agenda($message, $intent)) {
        $toolStartedAt = microtime(true);
        $eventItems = fallerito_rag_events(fallerito_query_words($message));
        $eventLines = array_map(
            static fn (array $item): string => '- ' . fallerito_string((string) ($item['title'] ?? 'Evento'), 110)
                . ' | ' . fallerito_string((string) ($item['text'] ?? ''), 220),
            array_slice($eventItems, 0, 5)
        );
        fallerito_agent_record_tool(
            $debug,
            'search_agenda_events',
            'Agenda',
            $eventItems !== [] ? 'completed' : 'empty',
            (int) round((microtime(true) - $toolStartedAt) * 1000),
            count($eventItems)
        );
        fallerito_agent_add_step($debug, 'He consultado la agenda disponible en la app para validar actos y horarios.');
        foreach (array_slice($eventItems, 0, 2) as $eventItem) {
            fallerito_agent_add_citation(
                $debug,
                'Agenda',
                fallerito_string((string) ($eventItem['title'] ?? 'Evento'), 140)
            );
        }
        fallerito_agent_append_context($contextBlocks, 'AGENDA', implode("\n", $eventLines));
    }

    if (fallerito_is_marketplace_query($message, $intent)) {
        $toolStartedAt = microtime(true);
        $marketplaceContext = fallerito_marketplace_context();
        $marketplaceRows = fallerito_marketplace_business_rows();
        fallerito_agent_record_tool(
            $debug,
            'search_marketplace',
            'Marketplace',
            trim($marketplaceContext) !== '' ? 'completed' : 'empty',
            (int) round((microtime(true) - $toolStartedAt) * 1000),
            count($marketplaceRows)
        );
        fallerito_agent_add_step($debug, 'He consultado marketplace para usar solo negocios y ofertas reales.');
        foreach (array_slice($marketplaceRows, 0, 2) as $row) {
            fallerito_agent_add_citation(
                $debug,
                'Marketplace',
                fallerito_string((string) ($row['name'] ?? 'Negocio'), 140)
            );
        }
        fallerito_agent_append_context($contextBlocks, 'MARKETPLACE', $marketplaceContext);
    }

    if (fallerito_agent_should_use_cendra($message, $intent)) {
        $toolStartedAt = microtime(true);
        $newsItems = fallerito_rag_cendra($message, fallerito_query_words($message));
        $newsLines = array_map(
            static fn (array $item): string => '- ' . fallerito_string((string) ($item['title'] ?? 'Articulo'), 110)
                . ' | ' . fallerito_string((string) ($item['text'] ?? ''), 220),
            array_slice($newsItems, 0, 5)
        );
        fallerito_agent_record_tool(
            $debug,
            'search_cendra_news',
            'Cendra',
            $newsItems !== [] ? 'completed' : 'empty',
            (int) round((microtime(true) - $toolStartedAt) * 1000),
            count($newsItems)
        );
        fallerito_agent_add_step($debug, 'He revisado noticias y articulos locales indexados en Cendra.');
        foreach (array_slice($newsItems, 0, 2) as $newsItem) {
            fallerito_agent_add_citation(
                $debug,
                'Cendra',
                fallerito_string((string) ($newsItem['title'] ?? 'Articulo'), 140)
            );
        }
        fallerito_agent_append_context($contextBlocks, 'CENDRA', implode("\n", $newsLines));
    }

    if (($userPosition !== null || $zoneHint !== null) && (fallerito_is_nearby_falla_query($message, $intent) || str_contains($normalized, 'cerca'))) {
        $toolStartedAt = microtime(true);
        $nearbyFallas = fallerito_best_planner_fallas($user, $userPosition, $message, $zoneHint);
        fallerito_agent_record_tool(
            $debug,
            'find_nearby_fallas',
            'Fallas cercanas',
            $nearbyFallas !== [] ? 'completed' : 'empty',
            (int) round((microtime(true) - $toolStartedAt) * 1000),
            count($nearbyFallas)
        );
        fallerito_agent_add_step(
            $debug,
            $userPosition !== null
                ? 'He cruzado GPS y catalogo para priorizar fallas cercanas.'
                : 'He usado la zona detectada para priorizar fallas cercanas sin pedirte mas contexto.'
        );
        foreach (array_slice($nearbyFallas, 0, 2) as $falla) {
            $distanceLabel = isset($falla['_planner_distance']) && is_numeric($falla['_planner_distance'])
                ? ' a ' . fallerito_format_distance((float) $falla['_planner_distance'])
                : '';
            fallerito_agent_add_citation(
                $debug,
                'Fallas cercanas',
                fallerito_string((string) ($falla['name'] ?? 'Falla') . $distanceLabel, 140)
            );
        }
    }

    if (fallerito_is_planner_query($message, $intent)) {
        $toolStartedAt = microtime(true);
        $minutes = fallerito_extract_duration_minutes($message);
        $plannerFallas = fallerito_best_planner_fallas($user, $userPosition, $message, $zoneHint);
        $plannerEvent = fallerito_best_planner_event($user, $message, $userPosition, $zoneHint);
        $plannerBusiness = fallerito_best_planner_business($message, $zoneHint);
        $planReply = fallerito_planner_reply($message, $minutes, $plannerFallas, $plannerEvent, $plannerBusiness);
        $count = count($plannerFallas) + ($plannerEvent !== null ? 1 : 0) + ($plannerBusiness !== null ? 1 : 0);
        fallerito_agent_record_tool(
            $debug,
            'build_fallero_plan',
            'Planificador fallero',
            $count > 0 ? 'completed' : 'empty',
            (int) round((microtime(true) - $toolStartedAt) * 1000),
            $count
        );
        fallerito_agent_add_step($debug, 'He montado un plan tentativo con tiempo, agenda, cercania y preferencias.');
        fallerito_agent_add_citation($debug, 'Planificador', $planReply);
        fallerito_agent_append_context($contextBlocks, 'PLANIFICADOR', $planReply);
    }

    if (fallerito_is_transport_query($message, $intent)) {
        $toolStartedAt = microtime(true);
        $transportReply = fallerito_transport_reply();
        fallerito_agent_record_tool(
            $debug,
            'transport_guidance',
            'Guia de transporte',
            'completed',
            (int) round((microtime(true) - $toolStartedAt) * 1000),
            1
        );
        fallerito_agent_add_step($debug, 'He activado la guia de transporte para orientar por metro, EMT y tramos a pie.');
        fallerito_agent_add_citation($debug, 'Transporte', 'Metrovalencia, EMT, Valenbisi y caminar');
        fallerito_agent_append_context($contextBlocks, 'TRANSPORTE', $transportReply);
    }

    if (fallerito_is_emergency_query($message, $intent)) {
        $toolStartedAt = microtime(true);
        $emergencyReply = fallerito_emergency_reply();
        fallerito_agent_record_tool(
            $debug,
            'emergency_guidance',
            'Guia de emergencia',
            'completed',
            (int) round((microtime(true) - $toolStartedAt) * 1000),
            1
        );
        fallerito_agent_add_step($debug, 'He activado la guia de emergencia para responder con prudencia y orientacion util.');
        fallerito_agent_add_citation($debug, 'Emergencia', '112, farmacias, Policia Local y puntos de informacion');
        fallerito_agent_append_context($contextBlocks, 'EMERGENCIA', $emergencyReply);
    }

    return [
        'context' => implode("\n\n", array_filter($contextBlocks, static fn (string $block): bool => trim($block) !== '')),
        'debug' => $debug,
    ];
}
