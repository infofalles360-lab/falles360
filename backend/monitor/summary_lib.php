<?php
declare(strict_types=1);

require_once __DIR__ . '/telegram.php';

function monitor_summary_count(array $rows, string $field, string $value): int
{
    return count(array_filter($rows, static fn (array $row): bool => (string) ($row[$field] ?? '') === $value));
}

function monitor_summary_time(string $dateTime): string
{
    $timestamp = strtotime($dateTime);
    return $timestamp !== false ? date('H:i', $timestamp) : $dateTime;
}

function monitor_fetch_daily_updates(): array
{
    monitor_bootstrap();

    $statement = monitor_db()->query(
        "SELECT du.id,
                du.title,
                du.url,
                du.priority,
                du.affected_module,
                du.detected_at,
                us.name AS source_name
         FROM detected_updates du
         INNER JOIN update_sources us ON us.id = du.source_id
         WHERE du.detected_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         ORDER BY FIELD(du.priority, 'urgent', 'high', 'medium', 'low'), du.detected_at DESC"
    );

    return $statement->fetchAll() ?: [];
}

function monitor_daily_summary_message(array $updates): string
{
    if ($updates === []) {
        return "📋 <b>Resumen diario Fallas 360</b>\n\nNo se han detectado actualizaciones relevantes en las últimas 24 horas.";
    }

    $priorityLabels = [
        'urgent' => '🚨 Urgentes',
        'high' => '🔥 Altas',
        'medium' => '🟡 Medias',
        'low' => '⚪ Bajas',
    ];
    $moduleLabels = [
        'premios' => '🏆 Premios',
        'agenda' => '📅 Agenda',
        'mapa' => '🗺️ Mapa',
        'noticias' => '📰 Noticias',
        'galeria' => '🖼️ Galería',
        'ficha_falla' => '🎨 Ficha falla',
        'alertas' => '🚨 Alertas',
    ];

    $message = "📋 <b>Resumen diario Fallas 360</b>\n\n";
    $message .= 'Actualizaciones detectadas en las últimas 24h: <b>' . count($updates) . "</b>\n\n";

    foreach ($priorityLabels as $priority => $label) {
        $message .= $label . ': <b>' . monitor_summary_count($updates, 'priority', $priority) . "</b>\n";
    }

    $message .= "\n<b>Módulos afectados:</b>\n";
    foreach ($moduleLabels as $module => $label) {
        $count = monitor_summary_count($updates, 'affected_module', $module);
        if ($count > 0 || in_array($module, ['premios', 'agenda', 'mapa', 'noticias', 'galeria'], true)) {
            $message .= $label . ': <b>' . $count . "</b>\n";
        }
    }

    $message .= "\n<b>Detalle:</b>\n";
    foreach (array_slice($updates, 0, 20) as $row) {
        $priorityIcon = match ((string) ($row['priority'] ?? 'medium')) {
            'urgent' => '🚨',
            'high' => '🔥',
            'low' => '⚪',
            default => '🟡',
        };
        $message .= "\n" . $priorityIcon . ' <b>' . monitor_html_escape((string) ($row['title'] ?? 'Actualización detectada')) . "</b>\n";
        $message .= 'Fuente: ' . monitor_html_escape((string) ($row['source_name'] ?? 'Fuente')) . "\n";
        $message .= 'Módulo: ' . monitor_html_escape((string) ($row['affected_module'] ?? 'noticias')) . "\n";
        $message .= 'Hora: ' . monitor_html_escape(monitor_summary_time((string) ($row['detected_at'] ?? ''))) . "\n";
        $url = trim((string) ($row['url'] ?? ''));
        if ($url !== '') {
            $message .= 'Enlace: ' . monitor_html_escape($url) . "\n";
        }
    }

    if (count($updates) > 20) {
        $message .= "\n...y " . (count($updates) - 20) . ' actualizaciones más pendientes de revisar.';
    }

    return $message;
}

function monitor_mark_daily_summary_sent(array $updates): void
{
    if ($updates === []) {
        return;
    }

    $ids = array_values(array_filter(array_map(static fn (array $row): int => (int) ($row['id'] ?? 0), $updates)));
    if ($ids === []) {
        return;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $update = monitor_db()->prepare('UPDATE detected_updates SET sent_in_daily_summary = 1 WHERE id IN (' . $placeholders . ')');
    $update->execute($ids);
}
