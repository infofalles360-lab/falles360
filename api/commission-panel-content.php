<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    app_require_method('GET');

    $commissionId = isset($_GET['commission_id'])
        ? app_validate_int($_GET['commission_id'], 'commission_id', ['min' => 1])
        : 0;
    $commissionWhere = $commissionId > 0 ? ' AND id = :commission_id' : '';
    $contentWhere = $commissionId > 0 ? ' AND commission_id = :commission_id' : '';
    $params = $commissionId > 0 ? ['commission_id' => $commissionId] : [];

    $commissionsStatement = db()->prepare(
        'SELECT id, name, slug, sector, section_name, neighborhood, address, casal_address,
                latitude, longitude, phone, email, website, instagram, tiktok, facebook,
                logo_path, description, updated_at
         FROM commissions
         WHERE status = :status' . $commissionWhere . '
         ORDER BY name ASC'
    );
    $commissionsStatement->execute(array_merge(['status' => 'active'], $params));

    $eventsStatement = db()->prepare(
        'SELECT id, commission_id, title, event_type, event_date, start_time, end_time,
                location_name, address, description, image_path, is_featured, updated_at
         FROM events
         WHERE status IN (:scheduled, :published)' . $contentWhere . '
         ORDER BY event_date ASC, COALESCE(start_time, "00:00:00") ASC'
    );
    $eventsStatement->execute(array_merge(['scheduled' => 'scheduled', 'published' => 'published'], $params));

    $galleryStatement = db()->prepare(
        'SELECT id, commission_id, album, image_path, description, updated_at
         FROM gallery
         WHERE status = :status' . $contentWhere . '
         ORDER BY updated_at DESC'
    );
    $galleryStatement->execute(array_merge(['status' => 'published'], $params));

    $sponsorsStatement = db()->prepare(
        'SELECT id, commission_id, name, logo_path, website, category, description, updated_at
         FROM sponsors
         WHERE status = :status AND is_active = 1' . $contentWhere . '
         ORDER BY name ASC'
    );
    $sponsorsStatement->execute(array_merge(['status' => 'published'], $params));

    app_json_response([
        'ok' => true,
        'items' => [
            'commissions' => $commissionsStatement->fetchAll() ?: [],
            'events' => $eventsStatement->fetchAll() ?: [],
            'gallery' => $galleryStatement->fetchAll() ?: [],
            'sponsors' => $sponsorsStatement->fetchAll() ?: [],
        ],
    ]);
} catch (Throwable $exception) {
    app_json_error('No se pudo cargar el contenido del panel de comisiones.', 500);
}
