<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/fallas_2027_calendar.php';

function upsert_event_category(PDO $db, string $name, string $icon, string $color): int
{
    $select = $db->prepare('SELECT id FROM event_categories WHERE name = :name LIMIT 1');
    $select->execute(['name' => $name]);
    $existingId = $select->fetchColumn();

    if ($existingId !== false) {
        $update = $db->prepare(
            'UPDATE event_categories
             SET icon = :icon,
                 color = :color
             WHERE id = :id'
        );
        $update->execute([
            'id' => (int) $existingId,
            'icon' => $icon,
            'color' => $color,
        ]);

        return (int) $existingId;
    }

    $insert = $db->prepare(
        'INSERT INTO event_categories (name, icon, color)
         VALUES (:name, :icon, :color)'
    );
    $insert->execute([
        'name' => $name,
        'icon' => $icon,
        'color' => $color,
    ]);

    return (int) $db->lastInsertId();
}

function sync_fallas_2027_events(PDO $db, array $events, array $categoryIds): void
{
    $range = fallas_2027_calendar_date_range();

    $delete = $db->prepare(
        'DELETE FROM events
         WHERE event_date BETWEEN :start_date AND :end_date
           AND falla_id IS NULL
           AND commission_id IS NULL'
    );
    $delete->execute([
        'start_date' => $range['start'],
        'end_date' => $range['cleanup_end'],
    ]);

    $insert = $db->prepare(
        'INSERT INTO events (
            category_id,
            falla_id,
            title,
            description,
            event_date,
            start_time,
            end_time,
            location_name,
            address,
            latitude,
            longitude,
            is_featured,
            status,
            commission_id
         ) VALUES (
            :category_id,
            NULL,
            :title,
            :description,
            :event_date,
            :start_time,
            :end_time,
            :location_name,
            :address,
            :latitude,
            :longitude,
            :is_featured,
            :status,
            NULL
         )'
    );

    foreach ($events as $event) {
        $insert->execute([
            'category_id' => $categoryIds[$event['category_name']],
            'title' => $event['title'],
            'description' => $event['description'],
            'event_date' => $event['event_date'],
            'start_time' => $event['start_time'],
            'end_time' => $event['end_time'],
            'location_name' => $event['location_name'],
            'address' => $event['address'],
            'latitude' => $event['latitude'],
            'longitude' => $event['longitude'],
            'is_featured' => $event['is_featured'] ? 1 : 0,
            'status' => 'scheduled',
        ]);
    }
}

$db = db();
$db->beginTransaction();

try {
    $events = fallas_2027_calendar_events();

    $categoryIds = [];
    foreach (fallas_2027_calendar_categories() as $category) {
        $categoryIds[$category['name']] = upsert_event_category(
            $db,
            $category['name'],
            $category['icon'],
            $category['color']
        );
    }

    sync_fallas_2027_events($db, $events, $categoryIds);

    $db->commit();

    echo 'Eventos sincronizados para Fallas 2027: ' . count($events) . PHP_EOL;
} catch (Throwable $exception) {
    $db->rollBack();
    fwrite(STDERR, 'Error al sincronizar eventos de Fallas 2027: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
