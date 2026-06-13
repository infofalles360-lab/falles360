<?php
declare(strict_types=1);

require_once __DIR__ . '/telegram.php';

const MONITOR_PRIORITY_KEYWORDS = [
    'urgent' => [
        'premios', 'clasificación', 'clasificacion', 'sección especial', 'seccion especial',
        'programa oficial', 'mascletà', 'mascleta', 'castillo', 'ofrenda', 'cortes de tráfico',
        'cortes de trafico', 'ubicación', 'ubicacion', 'cambio de horario', 'última hora',
        'ultima hora', 'incidencia',
    ],
    'high' => [
        'agenda', 'evento importante', 'acto oficial', 'recorrido', 'movilidad', 'seguridad',
        'comisión', 'comision', 'falla grande', 'falla infantil',
    ],
    'medium' => [
        'fotografías', 'fotografias', 'fotos', 'galería', 'galeria', 'artista fallero',
        'fichaje', 'boceto', 'entrevista', 'exposición', 'exposicion',
    ],
];

const MONITOR_MODULE_KEYWORDS = [
    'premios' => ['premios', 'clasificación', 'clasificacion', 'sección especial', 'seccion especial', 'ganadores'],
    'agenda' => ['programa', 'mascletà', 'mascleta', 'castillo', 'ofrenda', 'acto', 'horario', 'evento'],
    'mapa' => ['ubicación', 'ubicacion', 'mapa', 'recorrido', 'cortes de tráfico', 'cortes de trafico', 'movilidad', 'calles'],
    'galeria' => ['fotos', 'fotografías', 'fotografias', 'galería', 'galeria', 'imágenes', 'imagenes'],
    'ficha_falla' => ['comisión', 'comision', 'falla grande', 'falla infantil', 'artista fallero', 'lema'],
    'alertas' => ['incidencia', 'aviso', 'emergencia', 'cambio urgente', 'última hora', 'ultima hora'],
];

function monitor_fetch_url(string $url): array
{
    $handle = curl_init($url);

    if ($handle === false) {
        throw new RuntimeException('No se pudo iniciar cURL.');
    }

    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 4,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => FALLAS360_MONITOR_TIMEOUT_SECONDS,
        CURLOPT_USERAGENT => FALLAS360_MONITOR_USER_AGENT,
        CURLOPT_ENCODING => '',
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $body = curl_exec($handle);
    $error = curl_error($handle);
    $statusCode = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    $effectiveUrl = (string) curl_getinfo($handle, CURLINFO_EFFECTIVE_URL);
    curl_close($handle);

    if (!is_string($body)) {
        throw new RuntimeException($error !== '' ? $error : 'La fuente no devolvio contenido.');
    }

    return [
        'body' => $body,
        'status_code' => $statusCode,
        'effective_url' => $effectiveUrl !== '' ? $effectiveUrl : $url,
    ];
}

function monitor_extract_title(string $html, string $fallback): string
{
    if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $matches)) {
        $title = trim(html_entity_decode(strip_tags($matches[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if ($title !== '') {
            return mb_substr($title, 0, 255, 'UTF-8');
        }
    }

    return mb_substr($fallback, 0, 255, 'UTF-8');
}

function monitor_clean_content(string $content): string
{
    $content = preg_replace('/<script\b[^>]*>.*?<\/script>/is', ' ', $content) ?? $content;
    $content = preg_replace('/<style\b[^>]*>.*?<\/style>/is', ' ', $content) ?? $content;
    $content = preg_replace('/<nav\b[^>]*>.*?<\/nav>/is', ' ', $content) ?? $content;
    $content = preg_replace('/<footer\b[^>]*>.*?<\/footer>/is', ' ', $content) ?? $content;
    $content = strip_tags($content);
    $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $content = preg_replace('/\s+/u', ' ', $content) ?? $content;

    return trim($content);
}

function monitor_content_hash(string $cleanContent): string
{
    return hash('sha256', $cleanContent);
}

function monitor_contains_any(string $text, array $keywords): bool
{
    foreach ($keywords as $keyword) {
        if (str_contains($text, mb_strtolower($keyword, 'UTF-8'))) {
            return true;
        }
    }

    return false;
}

function monitor_classify_priority(string $text, int $sourceScore): string
{
    $text = mb_strtolower($text, 'UTF-8');

    foreach (['urgent', 'high', 'medium'] as $priority) {
        if (monitor_contains_any($text, MONITOR_PRIORITY_KEYWORDS[$priority])) {
            return $priority;
        }
    }

    return $sourceScore >= 90 ? 'medium' : 'low';
}

function monitor_classify_module(string $text): string
{
    $text = mb_strtolower($text, 'UTF-8');

    foreach (MONITOR_MODULE_KEYWORDS as $module => $keywords) {
        if (monitor_contains_any($text, $keywords)) {
            return $module;
        }
    }

    return 'noticias';
}

function monitor_update_type(string $cleanContent): string
{
    $text = mb_strtolower($cleanContent, 'UTF-8');

    if (monitor_contains_any($text, ['premios', 'clasificación', 'clasificacion', 'ganadores'])) {
        return 'premios';
    }

    if (monitor_contains_any($text, ['programa', 'agenda', 'horario', 'evento', 'acto'])) {
        return 'agenda';
    }

    if (monitor_contains_any($text, ['ubicación', 'ubicacion', 'recorrido', 'movilidad', 'calles'])) {
        return 'mapa';
    }

    return 'contenido';
}

function monitor_excerpt(string $text, int $maxLength = 1200): string
{
    $text = trim($text);

    if (mb_strlen($text, 'UTF-8') <= $maxLength) {
        return $text;
    }

    return rtrim(mb_substr($text, 0, $maxLength, 'UTF-8')) . '...';
}

function monitor_log_check(int $sourceId, string $status, ?int $responseCode = null, ?string $errorMessage = null): void
{
    $statement = monitor_db()->prepare(
        'INSERT INTO source_checks (source_id, status, response_code, error_message)
         VALUES (:source_id, :status, :response_code, :error_message)'
    );
    $statement->execute([
        'source_id' => $sourceId,
        'status' => $status,
        'response_code' => $responseCode,
        'error_message' => $errorMessage !== null ? monitor_excerpt($errorMessage, 2000) : null,
    ]);
}

function monitor_store_snapshot(int $sourceId, string $hash, string $content): void
{
    if (!monitor_table_exists('source_snapshots')) {
        return;
    }

    $statement = monitor_db()->prepare(
        'INSERT INTO source_snapshots (source_id, content_hash, content_text)
         VALUES (:source_id, :content_hash, :content_text)'
    );
    $statement->execute([
        'source_id' => $sourceId,
        'content_hash' => $hash,
        'content_text' => monitor_excerpt($content, 60000),
    ]);
}

function monitor_send_update_alert(array $source, array $update): void
{
    $message = "🚨 <b>Fallerito ha detectado una actualización</b>\n\n";
    $message .= '📌 <b>Fuente:</b> ' . monitor_html_escape((string) $source['name']) . "\n";
    $message .= '📰 <b>Título:</b> ' . monitor_html_escape((string) $update['title']) . "\n";
    $message .= '🔥 <b>Prioridad:</b> ' . monitor_html_escape((string) $update['priority']) . "\n";
    $message .= '📲 <b>Módulo afectado:</b> ' . monitor_html_escape((string) $update['affected_module']) . "\n";
    $message .= '🧭 <b>Tipo de actualización:</b> ' . monitor_html_escape((string) $update['update_type']) . "\n";
    $message .= '🔗 <b>Enlace:</b> ' . monitor_html_escape((string) $update['url']) . "\n";
    $message .= '🕒 <b>Detectado:</b> ' . monitor_html_escape((string) $update['detected_at']) . "\n\n";
    $message .= 'Estado: pendiente de revisar en Fallas 360.';

    sendTelegramMessage($message);
}

function monitor_process_source(array $source): array
{
    $sourceId = (int) $source['id'];
    $url = trim((string) $source['url']);

    try {
        $response = monitor_fetch_url($url);
        $statusCode = (int) $response['status_code'];

        if ($statusCode >= 400 || $statusCode === 0) {
            throw new RuntimeException('HTTP ' . $statusCode . ' revisando fuente.');
        }

        $cleanContent = monitor_clean_content((string) $response['body']);

        if ($cleanContent === '') {
            throw new RuntimeException('Contenido vacio tras limpiar la fuente.');
        }

        $hash = monitor_content_hash($cleanContent);
        $now = monitor_now();
        $lastHash = trim((string) ($source['last_hash'] ?? ''));

        monitor_log_check($sourceId, 'ok', $statusCode);

        if ($lastHash === '') {
            $statement = monitor_db()->prepare(
                'UPDATE update_sources
                 SET last_hash = :hash,
                     last_checked_at = :checked_at
                 WHERE id = :id'
            );
            $statement->execute([
                'hash' => $hash,
                'checked_at' => $now,
                'id' => $sourceId,
            ]);
            monitor_store_snapshot($sourceId, $hash, $cleanContent);

            return ['status' => 'initialized', 'source' => $source['name']];
        }

        if (hash_equals($lastHash, $hash)) {
            $statement = monitor_db()->prepare(
                'UPDATE update_sources SET last_checked_at = :checked_at WHERE id = :id'
            );
            $statement->execute([
                'checked_at' => $now,
                'id' => $sourceId,
            ]);

            return ['status' => 'unchanged', 'source' => $source['name']];
        }

        $title = monitor_extract_title((string) $response['body'], (string) $source['name']);
        $priority = monitor_classify_priority($cleanContent, (int) ($source['priority_score'] ?? 50));
        $module = monitor_classify_module($cleanContent);
        $updateType = monitor_update_type($cleanContent);
        $excerpt = monitor_excerpt($cleanContent);

        $insert = monitor_db()->prepare(
            'INSERT INTO detected_updates (
                source_id, title, url, update_type, priority, affected_module, extracted_content, status, detected_at
             ) VALUES (
                :source_id, :title, :url, :update_type, :priority, :affected_module, :extracted_content, :status, :detected_at
             )'
        );
        $insert->execute([
            'source_id' => $sourceId,
            'title' => $title,
            'url' => (string) $response['effective_url'],
            'update_type' => $updateType,
            'priority' => $priority,
            'affected_module' => $module,
            'extracted_content' => $excerpt,
            'status' => 'pending',
            'detected_at' => $now,
        ]);

        $updateId = (int) monitor_db()->lastInsertId();
        monitor_store_snapshot($sourceId, $hash, $cleanContent);

        $statement = monitor_db()->prepare(
            'UPDATE update_sources
             SET last_hash = :hash,
                 last_checked_at = :checked_at,
                 last_changed_at = :changed_at
             WHERE id = :id'
        );
        $statement->execute([
            'hash' => $hash,
            'checked_at' => $now,
            'changed_at' => $now,
            'id' => $sourceId,
        ]);

        monitor_send_update_alert($source, [
            'title' => $title,
            'url' => (string) $response['effective_url'],
            'priority' => $priority,
            'affected_module' => $module,
            'update_type' => $updateType,
            'detected_at' => $now,
        ]);

        return ['status' => 'changed', 'source' => $source['name'], 'updateId' => $updateId];
    } catch (Throwable $exception) {
        monitor_log_check($sourceId, 'error', null, $exception->getMessage());
        monitor_db()->prepare('UPDATE update_sources SET last_checked_at = :checked_at WHERE id = :id')
            ->execute([
                'checked_at' => monitor_now(),
                'id' => $sourceId,
            ]);

        return ['status' => 'error', 'source' => $source['name'], 'error' => $exception->getMessage()];
    }
}

monitor_bootstrap();

$statement = monitor_db()->query(
    'SELECT id, name, url, source_type, priority_score, last_hash
     FROM update_sources
     WHERE active = 1
     ORDER BY priority_score DESC, id ASC'
);

$results = [];
foreach ($statement->fetchAll() ?: [] as $source) {
    $results[] = monitor_process_source($source);
}

echo json_encode([
    'ok' => true,
    'checked' => count($results),
    'results' => $results,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
