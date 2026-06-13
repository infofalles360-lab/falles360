<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    app_require_method('GET');
    $user = api_authenticated_user_or_error();

    rate_limit_api_enforce('api_agenda', [
        ['scope' => 'user', 'max' => 50, 'window' => 60],
        ['scope' => 'session', 'max' => 50, 'window' => 60],
    ], app_rate_limit_context($user));

    // Obtener parámetros opcionales
    $startDate = isset($_GET['start']) ? app_validate_date_ymd($_GET['start'], 'start') : null;
    $endDate = isset($_GET['end']) ? app_validate_date_ymd($_GET['end'], 'end') : null;

    // Validar fechas si se proporcionan
    if (false && $startDate && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
        throw new InvalidArgumentException('Formato de fecha de inicio inválido. Use YYYY-MM-DD');
    }
    if (false && $endDate && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
        throw new InvalidArgumentException('Formato de fecha final inválido. Use YYYY-MM-DD');
    }

    // Si no se especifican fechas, usar el período de Fallas 2027
    // Validar que el rango sea coherente si se reciben ambas fechas
    if ($startDate && $endDate && $startDate > $endDate) {
        throw new InvalidArgumentException('La fecha de inicio no puede ser posterior a la fecha final.');
    }

    // Consultar eventos de agenda. Si no se indican fechas, devolver toda la agenda disponible.
    $pdo = db();
    $conditions = [];
    $params = [];

    if ($startDate) {
        $conditions[] = 'event_date >= :start_date';
        $params[':start_date'] = $startDate;
    }

    if ($endDate) {
        $conditions[] = 'event_date <= :end_date';
        $params[':end_date'] = $endDate;
    }

    $sql = 'SELECT 
            id,
            event_date,
            sort_datetime,
            display_time,
            title,
            description,
            location,
            category,
            route_text,
            is_all_day,
            is_featured
        FROM agenda_events';

    if ($conditions !== []) {
        $sql .= '
        WHERE ' . implode(' AND ', $conditions);
    }

    $sql .= '
        ORDER BY 
            event_date ASC,
            is_all_day DESC,
            sort_datetime ASC,
            id ASC';

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }
    $stmt->execute();

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Mapear resultados al formato esperado por el frontend
    $events = array_map(function ($row) {
        return [
            'id' => (string)$row['id'],
            'title' => (string)$row['title'],
            'time' => (string)($row['is_all_day'] ? '00:00' : substr($row['display_time'], 0, 5)),
            'location' => (string)$row['location'],
            'date' => (string)$row['event_date'],
            'type' => (string)($row['category'] ?? 'Agenda'),
            'description' => (string)($row['description'] ?? ''),
            'isLive' => (bool)$row['is_featured'],
        ];
    }, $rows);

    app_json_response([
        'ok' => true,
        'items' => $events,
        'count' => count($events),
        'period' => [
            'start' => $startDate,
            'end' => $endDate,
        ],
    ]);
} catch (Throwable $exception) {
    app_json_error('No se pudieron cargar los eventos de agenda.', 500);
}

