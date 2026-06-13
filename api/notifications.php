<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    app_require_method('GET');

    $statement = db()->prepare(
        'SELECT notifications.id, notifications.title, notifications.message, notifications.commission_id,
                notifications.is_read, notifications.created_at, commissions.name AS commission_name
         FROM notifications
         LEFT JOIN commissions ON commissions.id = notifications.commission_id
         WHERE notifications.title NOT IN (\'Contenido aprobado\', \'Contenido rechazado\')
           AND notifications.message <> \'Revision completada por administracion.\'
         ORDER BY notifications.created_at DESC, notifications.id DESC
         LIMIT 20'
    );
    $statement->execute();

    app_json_response([
        'ok' => true,
        'items' => array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'title' => (string) $row['title'],
            'message' => (string) $row['message'],
            'commissionId' => isset($row['commission_id']) ? (int) $row['commission_id'] : null,
            'commissionName' => $row['commission_name'] !== null ? (string) $row['commission_name'] : null,
            'isRead' => (bool) $row['is_read'],
            'createdAt' => (string) $row['created_at'],
        ], $statement->fetchAll() ?: []),
    ]);
} catch (Throwable $exception) {
    app_json_error('No se pudieron cargar los avisos.', 500);
}
