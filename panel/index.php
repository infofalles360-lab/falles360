<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/schema.php';
require_once __DIR__ . '/repository.php';

panel_require_auth();

$user = panel_user() ?? [];
$role = panel_role();
$modules = panel_modules();
$view = app_validate_string($_GET['view'] ?? 'dashboard', 'view', [
    'allow_empty' => true,
    'max' => 40,
]);
$moduleKey = app_validate_string($_GET['module'] ?? 'commissions', 'module', [
    'allow_empty' => true,
    'max' => 80,
]);
$action = app_validate_string($_POST['panel_action'] ?? $_GET['action'] ?? '', 'action', [
    'allow_empty' => true,
    'max' => 60,
]);

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!csrf_is_valid_request()) {
            throw new RuntimeException('Formulario caducado. Recarga la pagina.');
        }

        if ($action === 'save') {
            $moduleKey = app_validate_string($_POST['module'] ?? '', 'module', ['max' => 80]);
            panel_save($moduleKey, $_POST, $_FILES);
            panel_flash('Guardado correctamente. Si requiere aprobacion, queda pendiente de revision.');
            redirect_to(panel_base_url(['view' => 'module', 'module' => $moduleKey]));
        }

        if ($action === 'delete') {
            $moduleKey = app_validate_string($_POST['module'] ?? '', 'module', ['max' => 80]);
            panel_delete($moduleKey, app_validate_int($_POST['id'] ?? 0, 'id', ['min' => 1]));
            panel_flash('Registro eliminado.');
            redirect_to(panel_base_url(['view' => 'module', 'module' => $moduleKey]));
        }

        if ($action === 'user_status') {
            $targetStatus = app_validate_string($_POST['status'] ?? '', 'status', ['max' => 40]);
            panel_set_user_status(app_validate_int($_POST['user_id'] ?? 0, 'user_id', ['min' => 1]), $targetStatus);
            panel_flash($targetStatus === 'blocked' ? 'Usuario bloqueado y sesiones cerradas.' : 'Usuario activado correctamente.');
            redirect_to(panel_base_url(['view' => 'module', 'module' => 'users']));
        }

        if ($action === 'lead_status') {
            $leadStatus = app_validate_string($_POST['status'] ?? '', 'status', ['max' => 40]);
            panel_update_marketplace_lead_status(
                app_validate_int($_POST['lead_id'] ?? 0, 'lead_id', ['min' => 1]),
                $leadStatus,
                app_validate_string($_POST['admin_notes'] ?? '', 'admin_notes', ['allow_empty' => true, 'max' => 1600])
            );
            panel_flash('Estado de la propuesta actualizado.');
            redirect_to(panel_base_url(['view' => 'module', 'module' => 'marketplace_leads']));
        }

        if ($action === 'lead_convert') {
            $businessId = panel_convert_marketplace_lead(
                app_validate_int($_POST['lead_id'] ?? 0, 'lead_id', ['min' => 1]),
                app_validate_string($_POST['admin_notes'] ?? '', 'admin_notes', ['allow_empty' => true, 'max' => 1600])
            );
            panel_flash('Propuesta aceptada y convertida en negocio. Revisa la ficha antes de publicarla.');
            redirect_to(panel_base_url(['view' => 'module', 'module' => 'marketplace_businesses', 'edit' => $businessId]) . '#form');
        }

        if ($action === 'review') {
            panel_review_approval(
                app_validate_int($_POST['approval_id'] ?? 0, 'approval_id', ['min' => 1]),
                app_validate_string($_POST['decision'] ?? '', 'decision', ['max' => 40]),
                app_validate_string($_POST['reason'] ?? '', 'reason', ['allow_empty' => true, 'max' => 1600])
            );
            panel_flash('Revision registrada y notificacion enviada.');
            redirect_to(panel_base_url(['view' => 'approvals']));
        }

        if ($action === 'message') {
            if (!panel_is_admin()) {
                throw new RuntimeException('Solo administracion puede enviar avisos.');
            }
            $subject = app_validate_string($_POST['subject'] ?? '', 'subject', ['max' => 190, 'normalize_spaces' => true]);
            $message = app_validate_string($_POST['message'] ?? '', 'message', ['max' => 5000]);
            $channels = array_map(static fn (mixed $channel): string => app_validate_string($channel, 'channel', ['max' => 40]), (array) ($_POST['channels'] ?? ['internal']));
            if (!$channels) {
                $channels = ['internal'];
            }
            if ($subject === '' || $message === '') {
                throw new RuntimeException('El asunto y el mensaje son obligatorios.');
            }
            $targetCommissionId = isset($_POST['commission_id']) && $_POST['commission_id'] !== ''
                ? app_validate_int($_POST['commission_id'], 'commission_id', ['min' => 1])
                : null;
            $statement = db()->prepare('INSERT INTO admin_messages (commission_id, subject, message, created_by) VALUES (:commission_id, :subject, :message, :created_by)');
            $statement->execute([
                'commission_id' => $targetCommissionId,
                'subject' => $subject,
                'message' => $message,
                'created_by' => (int) $user['id'],
            ]);
            db()->prepare('INSERT INTO notifications (commission_id, title, message) VALUES (:commission_id, :title, :message)')->execute([
                'commission_id' => $targetCommissionId,
                'title' => $subject,
                'message' => $message,
            ]);
            $_SESSION['panel_notice_share_links'] = panel_notice_share_links(
                $targetCommissionId,
                $subject,
                $message,
                $channels,
                app_validate_string($_POST['whatsapp_phone'] ?? '', 'whatsapp_phone', ['allow_empty' => true, 'max' => 60])
            );
            panel_flash(in_array('internal', $channels, true) ? 'Aviso guardado en la app.' : 'Aviso preparado para compartir.');
            redirect_to(panel_base_url(['view' => 'messages']));
        }

        if ($action === 'delete_notice') {
            $notificationId = app_validate_int($_POST['notification_id'] ?? 0, 'notification_id', ['min' => 1]);
            $notification = db()->prepare('SELECT * FROM notifications WHERE id = :id AND (:admin = 1 OR commission_id = :commission_id OR user_id = :user_id) LIMIT 1');
            $notification->execute([
                'id' => $notificationId,
                'admin' => panel_is_admin() ? 1 : 0,
                'commission_id' => panel_current_commission_id() ?? 0,
                'user_id' => (int) $user['id'],
            ]);
            $row = $notification->fetch();
            if (!$row) {
                throw new RuntimeException('Aviso no encontrado.');
            }

            db()->prepare('DELETE FROM notifications WHERE id = :id')->execute(['id' => $notificationId]);
            if (panel_is_admin()) {
                db()->prepare('DELETE FROM admin_messages WHERE subject = :subject AND message = :message AND (commission_id <=> :commission_id) LIMIT 1')->execute([
                    'subject' => (string) $row['title'],
                    'message' => (string) $row['message'],
                    'commission_id' => $row['commission_id'],
                ]);
            }
            panel_flash('Aviso eliminado.');
            redirect_to(panel_base_url(['view' => 'messages']));
        }
    }
} catch (Throwable $exception) {
    panel_flash($exception->getMessage(), 'error');
    redirect_to(panel_base_url(['view' => $view, 'module' => $moduleKey]));
}

$flash = panel_flash();
$search = app_validate_string($_GET['q'] ?? '', 'q', ['allow_empty' => true, 'max' => 190, 'normalize_spaces' => true]);
$editId = isset($_GET['edit']) ? app_validate_int($_GET['edit'], 'edit', ['min' => 1]) : 0;
$currentModule = in_array($view, ['module', 'edit'], true) ? panel_module($moduleKey) : null;
$editRow = $currentModule && $editId > 0 ? panel_find($moduleKey, $editId) : null;
$commissionOptions = panel_commissions_options();
$myCommissionId = panel_current_commission_id();
$pendingStatement = db()->prepare("SELECT COUNT(*) FROM approvals WHERE status = 'pending'" . (panel_is_admin() ? '' : ' AND commission_id = :commission_id'));
$pendingStatement->execute(panel_is_admin() ? [] : ['commission_id' => $myCommissionId ?? 0]);
$pendingCount = (int) ($pendingStatement->fetchColumn() ?: 0);
$noticeShareLinks = $_SESSION['panel_notice_share_links'] ?? [];
unset($_SESSION['panel_notice_share_links']);

function panel_nav_item(string $href, string $label, string $icon, bool $active): void
{
    echo '<a class="nav-item ' . ($active ? 'is-active' : '') . '" href="' . panel_h($href) . '"><span>' . panel_h($icon) . '</span><strong>' . panel_h($label) . '</strong></a>';
}

function panel_module_nav_label(string $key, array $module): string
{
    if (panel_is_admin()) {
        return (string) $module['label'];
    }

    return [
        'commissions' => 'Perfil comision',
        'events' => 'Eventos',
        'gallery' => 'Galeria',
        'sponsors' => 'Patrocinadores',
    ][$key] ?? (string) $module['label'];
}

function panel_module_nav_icon(string $key, array $module): string
{
    if (panel_is_admin()) {
        return (string) $module['icon'];
    }

    return [
        'commissions' => 'P',
        'events' => 'E',
        'gallery' => 'G',
        'sponsors' => 'S',
    ][$key] ?? (string) $module['icon'];
}

function panel_badge(string $status): string
{
    return '<span class="badge badge--' . panel_h($status) . '">' . panel_h(panel_status_label($status)) . '</span>';
}

function panel_column_label(string $column): string
{
    return [
        'name' => 'Nombre',
        'sector' => 'Sector',
        'section_name' => 'Seccion',
        'assigned_user' => 'Usuario gestor',
        'email' => 'Email',
        'role' => 'Rol',
        'commission_name' => 'Comision',
        'status' => 'Estado',
    ][$column] ?? str_replace('_', ' ', ucfirst($column));
}

function panel_commission_section_meta(string $view, string $moduleKey = ''): array
{
    if ($view === 'monuments') {
        return ['Monumentos', 'Monumentos de la falla', 'Organiza los datos de la falla grande e infantil: lema, artista, ejercicio, imagen y estado de revision.', 'Solicitar alta'];
    }
    if ($view === 'news') {
        return ['Noticias', 'Noticias de la comision', 'Prepara comunicados, novedades y publicaciones para enviar a revision o compartir con los falleros.', 'Nueva noticia'];
    }
    if ($view === 'documents') {
        return ['Documentos', 'Documentos', 'Centraliza bases, memorias, autorizaciones y archivos internos de la comision.', 'Subir documento'];
    }
    if ($view === 'approvals') {
        return ['Revision', 'Cola de revision', 'Consulta que contenidos estan pendientes, publicados o rechazados por administracion.', 'Ver estados'];
    }
    if ($view === 'messages') {
        return ['Avisos', 'Avisos del administrador', 'Lee avisos internos y prepara comunicaciones por app, WhatsApp o email.', 'Nuevo aviso'];
    }
    if ($view === 'stats') {
        return ['Analitica', 'Estadisticas de la comision', 'Revisa visitas, actividad y contenido consultado dentro de la app.', 'Actualizar'];
    }
    if ($view === 'settings') {
        return ['Ajustes', 'Configuracion', 'Datos de acceso, recomendaciones y ajustes del panel de gestion.', 'Guardar'];
    }

    return [
        'commissions' => ['Perfil', 'Perfil de la comision', 'Mantiene al dia los datos publicos de tu falla: contacto, ubicacion, redes, logo y descripcion.', 'Guardar perfil'],
        'events' => ['Agenda', 'Eventos y actos', 'Programa actos, horarios y ubicaciones. Los cambios enviados pasan por revision si corresponde.', 'Nuevo evento'],
        'gallery' => ['Galeria', 'Galeria de fotos', 'Sube imagenes organizadas por album para mostrarlas en la app y en la ficha de la comision.', 'Subir fotos'],
        'sponsors' => ['Patrocinadores', 'Patrocinadores', 'Gestiona comercios, colaboradores y enlaces asociados a tu comision.', 'Nuevo patrocinador'],
    ][$moduleKey] ?? ['Gestion', 'Panel de gestion', 'Organiza la informacion de tu comision.', 'Crear'];
}

function panel_metric(string $label, string $value, string $icon): void
{
    echo '<article class="metric"><span>' . panel_h($icon) . '</span><div><strong>' . panel_h($value) . '</strong><small>' . panel_h($label) . '</small></div></article>';
}

function panel_whatsapp_phone(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if ($digits === '') {
        return '';
    }
    if (strlen($digits) === 9) {
        return '34' . $digits;
    }
    return $digits;
}

function panel_notice_targets(?int $commissionId): array
{
    if ($commissionId !== null && $commissionId > 0) {
        $statement = db()->prepare('SELECT id, name, phone, email FROM commissions WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $commissionId]);
        return $statement->fetchAll() ?: [];
    }

    return db()->query("SELECT id, name, phone, email FROM commissions WHERE status = 'active' ORDER BY name ASC LIMIT 50")->fetchAll() ?: [];
}

function panel_notice_share_links(?int $commissionId, string $subject, string $message, array $channels, string $manualWhatsappPhone = ''): array
{
    $links = [];
    $text = trim($subject . "\n\n" . $message);
    $targets = panel_notice_targets($commissionId);

    if (in_array('whatsapp', $channels, true)) {
        $manualPhone = panel_whatsapp_phone($manualWhatsappPhone);
        if ($manualPhone !== '') {
            $links[] = ['label' => 'WhatsApp manual', 'url' => 'https://wa.me/' . $manualPhone . '?text=' . rawurlencode($text)];
        }
        foreach ($targets as $target) {
            $phone = panel_whatsapp_phone((string) ($target['phone'] ?? ''));
            if ($phone !== '') {
                $links[] = ['label' => 'WhatsApp - ' . (string) $target['name'], 'url' => 'https://wa.me/' . $phone . '?text=' . rawurlencode($text)];
            }
        }
    }

    if (in_array('email', $channels, true)) {
        foreach ($targets as $target) {
            $email = trim((string) ($target['email'] ?? ''));
            if ($email !== '') {
                $links[] = ['label' => 'Email - ' . (string) $target['name'], 'url' => 'mailto:' . rawurlencode($email) . '?subject=' . rawurlencode($subject) . '&body=' . rawurlencode($message)];
            }
        }
    }

    return array_slice($links, 0, 80);
}

function panel_event_whatsapp_url(array $row): string
{
    $date = trim((string) ($row['event_date'] ?? ''));
    $time = trim(substr((string) ($row['start_time'] ?? ''), 0, 5));
    $location = trim((string) ($row['location_name'] ?? ''));
    $description = trim((string) ($row['description'] ?? ''));
    $lines = [
        'Fallas 360',
        trim((string) ($row['title'] ?? 'Evento')),
    ];

    if ($date !== '') {
        $lines[] = 'Fecha: ' . $date . ($time !== '' ? ' a las ' . $time : '');
    }
    if ($location !== '') {
        $lines[] = 'Lugar: ' . $location;
    }
    if ($description !== '') {
        $lines[] = $description;
    }

    return 'https://wa.me/?text=' . rawurlencode(implode("\n", array_filter($lines)));
}

function panel_event_whatsapp_poll_url(array $row): string
{
    $date = trim((string) ($row['event_date'] ?? ''));
    $time = trim(substr((string) ($row['start_time'] ?? ''), 0, 5));
    $location = trim((string) ($row['location_name'] ?? ''));
    $title = trim((string) ($row['title'] ?? 'Evento'));
    $lines = [
        'Fallas 360 - ' . $title,
        '',
        'Tenemos este acto programado' . ($date !== '' ? ' para el ' . $date : '') . ($time !== '' ? ' a las ' . $time : '') . '.',
    ];
    if ($location !== '') {
        $lines[] = 'Lugar: ' . $location;
    }
    $lines[] = '';
    $lines[] = 'Encuesta rapida: vas a asistir?';
    $lines[] = '1. Si, voy';
    $lines[] = '2. No puedo';
    $lines[] = '3. Estoy pendiente';
    $lines[] = '';
    $lines[] = 'Responde con 1, 2 o 3 para organizar la asistencia.';

    return 'https://wa.me/?text=' . rawurlencode(implode("\n", $lines));
}

function panel_count(string $table, ?string $where = null, array $params = []): int
{
    $statement = db()->prepare('SELECT COUNT(*) FROM ' . $table . ($where ? ' WHERE ' . $where : ''));
    $statement->execute($params);
    return (int) ($statement->fetchColumn() ?: 0);
}

function panel_scoped_count(string $table, string $status, ?int $commissionId): int
{
    $where = 'status = :status';
    $params = ['status' => $status];
    if (!panel_is_admin()) {
        $where .= ' AND commission_id = :commission_id';
        $params['commission_id'] = $commissionId ?? 0;
    }

    return panel_count($table, $where, $params);
}
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Panel de comisiones | Fallas 360</title>
    <link rel="stylesheet" href="./assets/panel.css?v=commission-panel-2">
</head>
<body>
<div class="app-shell app-shell--<?php echo panel_is_admin() ? 'admin' : 'commission'; ?> app-view--<?php echo panel_h($view); ?>">
    <aside class="sidebar" data-sidebar>
        <a class="brand" href="<?php echo panel_h(panel_base_url()); ?>"><span>F</span><strong>Fallas <b>360</b><small><?php echo panel_is_admin() ? 'Panel admin' : 'Panel de comision'; ?></small></strong></a>
        <?php if (!panel_is_admin()): ?>
        <nav class="commission-nav">
            <?php panel_nav_item(panel_base_url(), 'Dashboard', 'D', $view === 'dashboard'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'module', 'module' => 'commissions', 'edit' => (int) ($myCommissionId ?? 0)]), 'Perfil comision', 'P', $view === 'module' && $moduleKey === 'commissions'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'monuments']), 'Monumentos', 'M', $view === 'monuments'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'module', 'module' => 'events']), 'Eventos', 'E', $view === 'module' && $moduleKey === 'events'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'news']), 'Noticias', 'N', $view === 'news'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'module', 'module' => 'gallery']), 'Galeria', 'G', $view === 'module' && $moduleKey === 'gallery'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'module', 'module' => 'sponsors']), 'Patrocinadores', 'S', $view === 'module' && $moduleKey === 'sponsors'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'documents']), 'Documentos', 'O', $view === 'documents'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'messages']), 'Avisos del admin', 'A', $view === 'messages'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'settings']), 'Configuracion', 'C', $view === 'settings'); ?>
        </nav>
        <?php endif; ?>
        <nav>
            <?php panel_nav_item(panel_base_url(), 'Dashboard', '📊', $view === 'dashboard'); ?>
            <?php foreach ($modules as $key => $module): ?>
                <?php if (($module['admin_only'] ?? false) && !panel_is_admin()) continue; ?>
                <?php panel_nav_item(panel_base_url(['view' => 'module', 'module' => $key]), (string) $module['label'], (string) $module['icon'], $view === 'module' && $moduleKey === $key); ?>
            <?php endforeach; ?>
            <?php panel_nav_item(panel_base_url(['view' => 'approvals']), 'Aprobaciones', '✅', $view === 'approvals'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'stats']), 'Estadisticas', '📈', $view === 'stats'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'messages']), 'Avisos', '💬', $view === 'messages'); ?>
            <?php panel_nav_item(panel_base_url(['view' => 'settings']), 'Configuracion', '⚙️', $view === 'settings'); ?>
        </nav>
        <div class="sidebar-card"><span class="sidebar-avatar"><?php echo panel_h(strtoupper(substr((string) $user['name'], 0, 2))); ?></span><div><strong><?php echo panel_h((string) $user['name']); ?></strong><small><?php echo panel_h($role === 'admin' ? 'Administrador general' : 'Comision fallera'); ?></small><em>● En linea</em></div><a href="../logout.php">Salir</a></div>
    </aside>
    <div class="main">
        <header class="topbar">
            <button class="menu" data-sidebar-toggle>☰</button>
            <form class="search" method="get">
                <input type="hidden" name="view" value="<?php echo panel_h($view); ?>">
                <input type="hidden" name="module" value="<?php echo panel_h($moduleKey); ?>">
                <input name="q" value="<?php echo panel_h($search); ?>" placeholder="Buscar en tablas, comisiones, eventos...">
            </form>
            <?php if (!panel_is_admin()): ?>
            <div class="top-actions commission-top-actions">
                <span class="date-pill">Calendario <?php echo panel_h(date('d/m/Y')); ?></span>
                <span class="icon-pill">A<b><?php echo panel_h((string) $pendingCount); ?></b></span>
                <a class="top-link" href="<?php echo panel_h(panel_base_url(['view' => 'approvals'])); ?>">Enviar a revision</a>
            </div>
            <?php endif; ?>
            <div class="top-actions">
                <span class="date-pill">📅 <?php echo panel_h(date('d/m/Y')); ?></span>
                <span class="icon-pill">🔔<b><?php echo panel_h((string) $pendingCount); ?></b></span>
                <span class="icon-pill">☀️</span>
                <a class="top-link" href="../dashboard/dist/index.html?v=<?php echo panel_h((string) (is_file(__DIR__ . '/../dashboard/dist/index.html') ? filemtime(__DIR__ . '/../dashboard/dist/index.html') : '1')); ?>">Abrir app ↗</a>
            </div>
        </header>
        <?php if ($flash): ?><div class="flash flash--<?php echo panel_h((string) $flash['type']); ?>"><?php echo panel_h((string) $flash['message']); ?></div><?php endif; ?>
        <?php if ($noticeShareLinks): ?><section class="panel share-panel"><div><h2>Enviar por canales externos</h2><p>Abre el canal que quieras y se cargara el aviso ya preparado.</p></div><div class="share-links"><?php foreach ($noticeShareLinks as $link): ?><a href="<?php echo panel_h((string) $link['url']); ?>" target="_blank" rel="noopener"><?php echo panel_h((string) $link['label']); ?></a><?php endforeach; ?></div></section><?php endif; ?>

        <?php if ($view === 'dashboard'): ?>
            <?php
            $scopeWhere = panel_is_admin() ? null : 'commission_id = :commission_id';
            $scopeParams = panel_is_admin() ? [] : ['commission_id' => $myCommissionId ?? 0];
            $usersTotal = panel_is_admin() ? panel_count('users') : panel_count('users', 'commission_id = :commission_id', ['commission_id' => $myCommissionId ?? 0]);
            $usersActive = panel_is_admin() ? panel_count('users', "status = 'active'") : panel_count('users', "status = 'active' AND commission_id = :commission_id", ['commission_id' => $myCommissionId ?? 0]);
            $commissionsActive = panel_is_admin() ? panel_count('commissions', "status = 'active'") : panel_count('commissions', "status = 'active' AND id = :commission_id", ['commission_id' => $myCommissionId ?? 0]);
            $eventsTotal = panel_count('events', trim(($scopeWhere ? $scopeWhere . ' AND ' : '') . "status IN ('scheduled', 'published')"), $scopeParams);
            $eventsPending = panel_count('events', trim(($scopeWhere ? $scopeWhere . ' AND ' : '') . "status = 'pending'"), $scopeParams);
            $galleryPending = panel_count('gallery', trim(($scopeWhere ? $scopeWhere . ' AND ' : '') . "status = 'pending'"), $scopeParams);
            $sponsorsPending = panel_count('sponsors', trim(($scopeWhere ? $scopeWhere . ' AND ' : '') . "status = 'pending'"), $scopeParams);
            $contentPending = $galleryPending + $sponsorsPending + $eventsPending;
            $draftTotal = panel_count('gallery', trim(($scopeWhere ? $scopeWhere . ' AND ' : '') . "status = 'draft'"), $scopeParams) + panel_count('sponsors', trim(($scopeWhere ? $scopeWhere . ' AND ' : '') . "status = 'draft'"), $scopeParams);
            $publishedTotal = panel_count('gallery', trim(($scopeWhere ? $scopeWhere . ' AND ' : '') . "status = 'published'"), $scopeParams) + panel_count('sponsors', trim(($scopeWhere ? $scopeWhere . ' AND ' : '') . "status = 'published'"), $scopeParams) + $eventsTotal;
            $rejectedTotal = panel_count('gallery', trim(($scopeWhere ? $scopeWhere . ' AND ' : '') . "status = 'rejected'"), $scopeParams) + panel_count('sponsors', trim(($scopeWhere ? $scopeWhere . ' AND ' : '') . "status = 'rejected'"), $scopeParams);
            $statsStatement = db()->prepare('SELECT metric, SUM(value) AS total FROM stats WHERE recorded_on >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)' . (panel_is_admin() ? '' : ' AND commission_id = :commission_id') . ' GROUP BY metric ORDER BY total DESC LIMIT 6');
            $statsStatement->execute(panel_is_admin() ? [] : ['commission_id' => $myCommissionId ?? 0]);
            $statsRows = $statsStatement->fetchAll() ?: [];
            $eventStatement = db()->prepare('SELECT title, event_date, start_time, location_name, status FROM events WHERE status IN (\'scheduled\', \'published\')' . (panel_is_admin() ? '' : ' AND commission_id = :commission_id') . ' ORDER BY event_date ASC, COALESCE(start_time, "00:00:00") ASC LIMIT 5');
            $eventStatement->execute(panel_is_admin() ? [] : ['commission_id' => $myCommissionId ?? 0]);
            $eventRows = $eventStatement->fetchAll() ?: [];
            $commissionStatement = db()->prepare('SELECT name, neighborhood, updated_at, status FROM commissions' . (panel_is_admin() ? '' : ' WHERE id = :commission_id') . ' ORDER BY updated_at DESC LIMIT 5');
            $commissionStatement->execute(panel_is_admin() ? [] : ['commission_id' => $myCommissionId ?? 0]);
            $commissionRows = $commissionStatement->fetchAll() ?: [];
            $currentCommission = $commissionRows[0] ?? [];
            if (!panel_is_admin() && $myCommissionId) {
                $currentCommissionStatement = db()->prepare('SELECT * FROM commissions WHERE id = :commission_id LIMIT 1');
                $currentCommissionStatement->execute(['commission_id' => $myCommissionId]);
                $currentCommission = $currentCommissionStatement->fetch() ?: $currentCommission;
            }
            $activityStatement = db()->prepare('SELECT action, entity_type, details, created_at FROM activity_logs' . (panel_is_admin() ? '' : ' WHERE commission_id = :commission_id') . ' ORDER BY created_at DESC LIMIT 6');
            $activityStatement->execute(panel_is_admin() ? [] : ['commission_id' => $myCommissionId ?? 0]);
            $activityRows = $activityStatement->fetchAll() ?: [];
            $approvalRows = array_slice(panel_approval_rows(), 0, 5);
            $lastActivity = $activityRows[0]['created_at'] ?? null;
            $commissionVisits = 0;
            foreach ($statsRows as $statsRow) {
                if (in_array((string) $statsRow['metric'], ['commission_view', 'commission_views', 'profile_view'], true)) {
                    $commissionVisits += (int) $statsRow['total'];
                }
            }
            $dashboardTitle = panel_is_admin() ? 'Panel de control total de Fallas 360' : 'Panel de gestion de tu falla';
            $dashboardSubtitle = panel_is_admin()
                ? 'Gestiona la plataforma con los datos reales registrados en la app: usuarios, comisiones, eventos, galeria, patrocinadores y aprobaciones.'
                : 'Gestiona toda la informacion de tu falla: perfil, actos, galeria, patrocinadores y cambios para que el administrador los revise.';
            ?>
            <?php if (!panel_is_admin()): ?>
            <section class="hero hero--commission"><div><span>Panel privado de comision</span><h1><?php echo panel_h($dashboardTitle); ?></h1><p><?php echo panel_h($dashboardSubtitle); ?></p></div><a class="hero-pending" href="<?php echo panel_h(panel_base_url(['view' => 'approvals'])); ?>"><i>R</i><small>Elementos pendientes de revision</small><strong><?php echo panel_h((string) $pendingCount); ?></strong><span>Esperando aprobacion del administrador</span><em>Ver cola -></em></a></section>
            <section class="metrics-grid metrics-grid--commission">
                <?php panel_metric('Contenido publicado', (string) $publishedTotal, 'C'); ?>
                <?php panel_metric('Pendiente revision', (string) $contentPending, 'R'); ?>
                <?php panel_metric('Visitas comision', (string) $commissionVisits, 'V'); ?>
                <?php panel_metric('Proximos actos', (string) $eventsTotal, 'E'); ?>
            </section>
            <section class="dashboard-grid dashboard-grid--commission-main">
                <article class="panel commission-profile-card"><div class="widget-head"><h2>Perfil de la comision</h2><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'commissions', 'edit' => (int) ($myCommissionId ?? 0)])); ?>#form">Editar</a></div><div class="commission-profile-grid"><div class="commission-field"><small>Nombre oficial</small><strong><?php echo panel_h((string) ($currentCommission['name'] ?? 'Comision sin nombre')); ?></strong></div><div class="commission-field"><small>Sector</small><strong><?php echo panel_h((string) ($currentCommission['sector'] ?? 'Pendiente')); ?></strong></div><div class="commission-field"><small>Seccion</small><strong><?php echo panel_h((string) ($currentCommission['section_name'] ?? 'Pendiente')); ?></strong></div><div class="commission-field"><small>Telefono</small><strong><?php echo panel_h((string) ($currentCommission['phone'] ?? 'Pendiente')); ?></strong></div><div class="commission-field commission-field--wide"><small>Direccion del casal</small><strong><?php echo panel_h((string) ($currentCommission['address'] ?? 'Pendiente')); ?></strong></div><div class="commission-field commission-field--wide"><small>Descripcion breve</small><strong><?php echo panel_h((string) ($currentCommission['description'] ?? 'Sin descripcion registrada')); ?></strong></div></div></article>
                <article class="panel table-preview"><div class="widget-head"><h2>Cola de revision</h2><a href="<?php echo panel_h(panel_base_url(['view' => 'approvals'])); ?>">Ver toda la cola</a></div><table><thead><tr><th>Tipo</th><th>Elemento</th><th>Estado</th></tr></thead><tbody><?php foreach ($approvalRows as $approval): ?><tr><td><?php echo panel_h($approval['entity_type']); ?></td><td>#<?php echo (int) $approval['entity_id']; ?></td><td><?php echo panel_badge((string) $approval['status']); ?></td></tr><?php endforeach; ?><?php if (!$approvalRows): ?><tr><td colspan="3"><div class="empty-widget">Sin solicitudes de aprobacion.</div></td></tr><?php endif; ?></tbody></table></article>
                <article class="panel"><h2>Accesos rapidos</h2><div class="quick-actions quick-actions--commission"><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'events'])); ?>"><span>E</span><strong>Nuevo evento</strong></a><a href="<?php echo panel_h(panel_base_url(['view' => 'messages'])); ?>"><span>N</span><strong>Nueva noticia</strong></a><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'gallery'])); ?>"><span>G</span><strong>Subir fotos</strong></a><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'sponsors'])); ?>"><span>P</span><strong>Patrocinador</strong></a><a href="<?php echo panel_h(panel_base_url(['view' => 'messages'])); ?>"><span>A</span><strong>Enviar aviso</strong></a><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'commissions', 'edit' => (int) ($myCommissionId ?? 0)])); ?>#form"><span>U</span><strong>Ubicacion</strong></a></div></article>
            </section>
            <section class="dashboard-grid dashboard-grid--commission-bottom">
                <article class="panel widget-card"><div class="widget-head"><h2>Proximos eventos</h2><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'events'])); ?>">Ver calendario</a></div><div class="event-widget-list"><?php foreach ($eventRows as $eventRow): ?><div class="event-widget-item"><time><strong><?php echo panel_h(date('d', strtotime((string) $eventRow['event_date']))); ?></strong><span><?php echo panel_h(strtoupper(date('M', strtotime((string) $eventRow['event_date'])))); ?></span></time><div><b><?php echo panel_h($eventRow['title']); ?></b><small><?php echo panel_h($eventRow['location_name'] ?: 'Ubicacion pendiente'); ?></small></div><em><?php echo panel_h(substr((string) $eventRow['start_time'], 0, 5) ?: '--:--'); ?></em></div><?php endforeach; ?><?php if (!$eventRows): ?><div class="empty-widget">Sin eventos visibles registrados.</div><?php endif; ?></div></article>
                <article class="panel widget-card"><div class="widget-head"><h2>Avisos del administrador</h2><a href="<?php echo panel_h(panel_base_url(['view' => 'messages'])); ?>">Ver todos</a></div><div class="activity-widget-list"><?php foreach (array_slice($activityRows, 0, 3) as $activityRow): ?><div class="activity-widget-item"><span>A</span><div><b><?php echo panel_h($activityRow['action']); ?></b><small><?php echo panel_h($activityRow['details'] ?: 'Sin detalle'); ?></small></div><em><?php echo panel_h(date('d/m', strtotime((string) $activityRow['created_at']))); ?></em></div><?php endforeach; ?><?php if (!$activityRows): ?><div class="empty-widget">Sin avisos recientes.</div><?php endif; ?></div></article>
                <article class="panel widget-card"><div class="widget-head"><h2>Galeria reciente</h2><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'gallery'])); ?>">Ver galeria</a></div><div class="gallery-strip"><div>Fotos</div><div>Actos</div><div>Monumentos</div><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'gallery'])); ?>">Subir fotos</a></div></article>
            </section>
            <?php endif; ?>
            <section class="hero"><div><span>♛ <?php echo $role === 'admin' ? 'Consola central de administracion' : 'Panel privado de comision'; ?></span><h1><?php echo $role === 'admin' ? 'Panel de control total de Fallas 360' : 'Panel de control de tu comision'; ?></h1><p>Gestiona la plataforma con los datos reales registrados en la app: usuarios, comisiones, eventos, galeria, patrocinadores y aprobaciones.</p></div><a class="hero-pending" href="<?php echo panel_h(panel_base_url(['view' => 'approvals'])); ?>"><i>🛡</i><small>Resumen de aprobaciones pendientes</small><strong><?php echo panel_h((string) $pendingCount); ?></strong><span>Total pendientes</span><em>Ir a aprobaciones →</em><div><b><?php echo panel_h((string) $contentPending); ?></b><b><?php echo panel_h((string) $eventsPending); ?></b><b><?php echo panel_h((string) $galleryPending); ?></b></div><div><small>Contenidos</small><small>Eventos</small><small>Galeria</small></div></a></section>
            <section class="metrics-grid">
                <?php panel_metric('Usuarios registrados', (string) $usersTotal, '👥'); ?>
                <?php panel_metric('Usuarios activos', (string) $usersActive, '👤'); ?>
                <?php panel_metric('Comisiones activas', (string) $commissionsActive, '📋'); ?>
                <?php panel_metric('Eventos visibles', (string) $eventsTotal, '📅'); ?>
                <?php panel_metric('Contenido en revision', (string) $contentPending, '✅'); ?>
            </section>
            <?php $usersTabModule = panel_is_admin() ? 'users' : 'commissions'; $usersTabLabel = panel_is_admin() ? 'Usuarios activos' : 'Mi comision'; $usersTabCount = panel_is_admin() ? $usersActive : $commissionsActive; ?>
            <section class="dashboard-grid dashboard-grid--top">
                <article class="panel panel-flow"><h2>Cola de aprobaciones</h2><div class="approval-tabs"><a href="<?php echo panel_h(panel_base_url(['view' => 'approvals'])); ?>"><strong>Aprobaciones</strong><span><?php echo panel_h((string) $pendingCount); ?></span></a><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => $usersTabModule])); ?>"><strong><?php echo panel_h($usersTabLabel); ?></strong><span><?php echo panel_h((string) $usersTabCount); ?></span></a><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'gallery'])); ?>"><strong>Contenido</strong><span><?php echo panel_h((string) $contentPending); ?></span></a></div><div class="steps"><span data-count="<?php echo panel_h((string) $draftTotal); ?>">✏️<b>Borrador</b><small>Contenido en creacion</small></span><span data-count="<?php echo panel_h((string) $contentPending); ?>">⏳<b>Pendiente</b><small>En espera de revision</small></span><span data-count="<?php echo panel_h((string) $publishedTotal); ?>">✅<b>Visible</b><small>Publicado en la app</small></span><span data-count="<?php echo panel_h((string) $rejectedTotal); ?>">✕<b>Rechazado</b><small>Requiere correccion</small></span></div><p>Los numeros salen de las tablas reales del panel. Si no hay registros, se muestra cero o un estado vacio.</p></article>
                <article class="panel table-preview"><div class="widget-head"><h2>Ultimas solicitudes</h2><a href="<?php echo panel_h(panel_base_url(['view' => 'approvals'])); ?>">Ver todas</a></div><table><thead><tr><th>Contenido</th><th>Comision</th><th>Estado</th></tr></thead><tbody><?php foreach ($approvalRows as $approval): ?><tr><td><?php echo panel_h($approval['entity_type']); ?> #<?php echo (int) $approval['entity_id']; ?></td><td><?php echo panel_h($approval['commission_name'] ?? 'General'); ?></td><td><?php echo panel_badge((string) $approval['status']); ?></td></tr><?php endforeach; ?><?php if (!$approvalRows): ?><tr><td colspan="3"><div class="empty-widget">Sin solicitudes de aprobacion.</div></td></tr><?php endif; ?></tbody></table></article>
                <article class="panel"><h2>Accesos rapidos</h2><div class="quick-actions"><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'events'])); ?>">📅<strong>Gestionar eventos</strong><small><?php echo panel_h((string) $eventsTotal); ?> visibles</small></a><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'commissions'])); ?>">🏛<strong>Comisiones</strong><small><?php echo panel_h((string) $commissionsActive); ?> activas</small></a><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'gallery'])); ?>">🖼<strong>Galeria</strong><small><?php echo panel_h((string) $galleryPending); ?> pendientes</small></a><a href="<?php echo panel_h(panel_base_url(['view' => 'approvals'])); ?>">📋<strong>Revisar cola</strong><small><?php echo panel_h((string) $pendingCount); ?> pendientes</small></a></div></article>
            </section>
            <section class="dashboard-grid dashboard-grid--bottom">
                <article class="panel widget-card"><div class="widget-head"><h2>Proximos eventos</h2><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'events'])); ?>">Ver calendario</a></div><div class="event-widget-list"><?php foreach ($eventRows as $eventRow): ?><div class="event-widget-item"><time><strong><?php echo panel_h(date('d', strtotime((string) $eventRow['event_date']))); ?></strong><span><?php echo panel_h(strtoupper(date('M', strtotime((string) $eventRow['event_date'])))); ?></span></time><div><b><?php echo panel_h($eventRow['title']); ?></b><small><?php echo panel_h($eventRow['location_name'] ?: 'Ubicacion pendiente'); ?></small></div><em><?php echo panel_h(substr((string) $eventRow['start_time'], 0, 5) ?: '--:--'); ?></em></div><?php endforeach; ?><?php if (!$eventRows): ?><div class="empty-widget">Sin eventos visibles registrados.</div><?php endif; ?></div></article>
                <article class="panel widget-card"><div class="widget-head"><h2>Comisiones actualizadas</h2><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'commissions'])); ?>">Ver todas</a></div><div class="commission-widget-list"><?php foreach ($commissionRows as $commissionRow): ?><div class="commission-widget-item"><span><?php echo panel_h(strtoupper(substr((string) $commissionRow['name'], 0, 2))); ?></span><div><b><?php echo panel_h($commissionRow['name']); ?></b><small><?php echo panel_h($commissionRow['neighborhood'] ?: 'Barrio pendiente'); ?></small></div><?php echo panel_badge((string) $commissionRow['status']); ?></div><?php endforeach; ?><?php if (!$commissionRows): ?><div class="empty-widget">Sin comisiones registradas.</div><?php endif; ?></div></article>
                <article class="panel widget-card widget-card--wide"><div class="widget-head"><h2>Resumen de actividad</h2><span>Ultimos 30 dias</span></div><?php if ($statsRows): ?><div class="real-stats-list"><?php foreach ($statsRows as $statsRow): ?><div><span><?php echo panel_h($statsRow['metric']); ?></span><strong><?php echo panel_h((string) $statsRow['total']); ?></strong></div><?php endforeach; ?></div><?php else: ?><div class="empty-widget empty-widget--large">Sin estadisticas registradas todavia.</div><?php endif; ?></article>
                <article class="panel widget-card"><div class="widget-head"><h2>Actividad reciente</h2><a href="<?php echo panel_h(panel_base_url(['view' => 'stats'])); ?>">Ver todo</a></div><div class="activity-widget-list"><?php foreach ($activityRows as $activityRow): ?><div class="activity-widget-item"><span>✓</span><div><b><?php echo panel_h($activityRow['action']); ?></b><small><?php echo panel_h(($activityRow['entity_type'] ?: 'Sistema') . ' · ' . ($activityRow['details'] ?: 'Sin detalle')); ?></small></div><em><?php echo panel_h(date('d/m H:i', strtotime((string) $activityRow['created_at']))); ?></em></div><?php endforeach; ?><?php if (!$activityRows): ?><div class="empty-widget">Sin actividad registrada.</div><?php endif; ?></div></article>
                <article class="panel widget-card"><div class="widget-head"><h2>Sistema</h2><span>Datos reales</span></div><div class="status-widget-list"><div class="status-widget-item"><span>Base de datos</span><strong>Operativa</strong></div><div class="status-widget-item"><span>Usuarios activos</span><strong><?php echo panel_h((string) $usersActive); ?></strong></div><div class="status-widget-item"><span>Contenido visible</span><strong><?php echo panel_h((string) $publishedTotal); ?></strong></div><div class="status-widget-item"><span>Ultima actividad</span><strong><?php echo $lastActivity ? panel_h(date('d/m H:i', strtotime((string) $lastActivity))) : 'Sin registros'; ?></strong></div></div></article>
            </section>
        <?php elseif ($view === 'module' && $currentModule): ?>
            <?php $rows = panel_rows($moduleKey, $search); ?>
            <?php $isMarketplaceModule = str_starts_with($moduleKey, 'marketplace_'); ?>
            <?php $marketplaceModules = [
                'marketplace_leads' => ['1. Propuestas', 'Entradas desde la landing para revisar y aceptar.', panel_count('marketplace_leads', "status = 'new'")],
                'marketplace_businesses' => ['2. Negocios', 'Ficha base de cada comercio o sponsor.', panel_count('marketplace_businesses', "status = 'active'")],
                'marketplace_coupons' => ['3. Cupones', 'Promociones con condiciones de canje.', panel_count('marketplace_coupons', "status = 'active'")],
                'marketplace_products' => ['4. Productos', 'Merchandising y articulos con precio.', panel_count('marketplace_products', "status = 'active'")],
                'marketplace_experiences' => ['5. Experiencias', 'Reservas, rutas y planes falleros.', panel_count('marketplace_experiences', "status = 'active'")],
                'marketplace_settings' => ['6. Portada', 'Textos principales del marketplace.', panel_count('marketplace_settings', "status = 'active'")],
                'marketplace_filters' => ['7. Filtros', 'Chips y accesos rapidos de la app.', panel_count('marketplace_filters', "status = 'active'")],
            ]; ?>
            <?php $sectionMeta = !panel_is_admin() ? panel_commission_section_meta($view, $moduleKey) : [(string) $currentModule['singular'], (string) $currentModule['label'], $moduleKey === 'commissions' ? 'Crea cada falla/comision, asigna su usuario gestor y activa el acceso privado a su panel.' : 'CRUD funcional con estados visuales, filtros, subida de imagenes y permisos por rol.', $moduleKey === 'commissions' ? 'Nueva comision' : 'Crear / editar']; ?>
            <section class="page-head <?php echo $isMarketplaceModule ? 'page-head--marketplace' : (!panel_is_admin() ? 'page-head--section' : ($moduleKey === 'commissions' ? 'page-head--commission' : '')); ?>"><div><span><?php echo $isMarketplaceModule ? 'Marketplace' : panel_h($sectionMeta[0]); ?></span><h1><?php echo $isMarketplaceModule ? panel_h((string) ($marketplaceModules[$moduleKey][0] ?? 'Marketplace')) : panel_h($sectionMeta[1]); ?></h1><p><?php echo $isMarketplaceModule ? panel_h((string) ($marketplaceModules[$moduleKey][1] ?? 'Gestiona el marketplace por pasos.')) : panel_h($sectionMeta[2]); ?></p></div><?php if ($isMarketplaceModule && $moduleKey === 'marketplace_leads'): ?><a class="button" href="../business-proposal.php" target="_blank" rel="noopener">Ver formulario publico</a><?php else: ?><a class="button" href="#form"><?php echo $isMarketplaceModule ? 'Crear / editar' : panel_h($sectionMeta[3]); ?></a><?php endif; ?></section>
            <?php if ($isMarketplaceModule): ?>
                <section class="marketplace-tabs">
                    <?php foreach ($marketplaceModules as $marketplaceKey => [$marketplaceLabel, $marketplaceCopy, $marketplaceCount]): ?>
                        <a class="<?php echo $moduleKey === $marketplaceKey ? 'is-active' : ''; ?>" href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => $marketplaceKey])); ?>">
                            <strong><?php echo panel_h($marketplaceLabel); ?></strong>
                            <small><?php echo panel_h($marketplaceCopy); ?></small>
                            <span><?php echo panel_h((string) $marketplaceCount); ?></span>
                        </a>
                    <?php endforeach; ?>
                </section>
                <section class="marketplace-workflow">
                    <a class="<?php echo $moduleKey === 'marketplace_leads' ? 'is-current' : ''; ?>" href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'marketplace_leads'])); ?>"><strong>Revisar</strong><small>Acepta o descarta propuestas</small></a>
                    <a class="<?php echo $moduleKey === 'marketplace_businesses' ? 'is-current' : ''; ?>" href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'marketplace_businesses'])); ?>"><strong>Preparar</strong><small>Completa fichas de negocio</small></a>
                    <a class="<?php echo in_array($moduleKey, ['marketplace_coupons', 'marketplace_products', 'marketplace_experiences'], true) ? 'is-current' : ''; ?>" href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'marketplace_coupons'])); ?>"><strong>Publicar oferta</strong><small>Cupones, productos o experiencias</small></a>
                    <a class="<?php echo in_array($moduleKey, ['marketplace_settings', 'marketplace_filters'], true) ? 'is-current' : ''; ?>" href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'marketplace_settings'])); ?>"><strong>Ajustar portada</strong><small>Textos y accesos visibles</small></a>
                </section>
                <?php if ($moduleKey === 'marketplace_leads'): ?>
                <section class="marketplace-summary">
                    <article><span>Nuevas</span><strong><?php echo panel_h((string) panel_count($moduleKey, "status = 'new'")); ?></strong><small>Pendientes de revisar</small></article>
                    <article><span>En seguimiento</span><strong><?php echo panel_h((string) (panel_count($moduleKey, "status = 'contacted'") + panel_count($moduleKey, "status = 'qualified'"))); ?></strong><small>Contactadas o cualificadas</small></article>
                    <article><span>Convertidas</span><strong><?php echo panel_h((string) panel_count($moduleKey, "status = 'converted'")); ?></strong><small>Pasadas a negocio</small></article>
                </section>
                <?php else: ?>
                <section class="marketplace-summary">
                    <article><span>Activos</span><strong><?php echo panel_h((string) panel_count($moduleKey, "status = 'active'")); ?></strong><small>Visibles ahora en la app</small></article>
                    <article><span>Inactivos</span><strong><?php echo panel_h((string) panel_count($moduleKey, "status = 'inactive'")); ?></strong><small>Ocultos sin borrar datos</small></article>
                    <article><span>Total</span><strong><?php echo panel_h((string) count($rows)); ?></strong><small>Registros en este bloque</small></article>
                </section>
                <?php endif; ?>
                <section class="marketplace-manager"><div class="marketplace-manager__list">
            <?php endif; ?>
            <?php if (!panel_is_admin()): ?><section class="section-tabs"><a class="<?php echo $moduleKey === 'commissions' ? 'is-active' : ''; ?>" href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'commissions', 'edit' => (int) ($myCommissionId ?? 0)])); ?>">Perfil</a><a class="<?php echo $moduleKey === 'events' ? 'is-active' : ''; ?>" href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'events'])); ?>">Eventos</a><a class="<?php echo $moduleKey === 'gallery' ? 'is-active' : ''; ?>" href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'gallery'])); ?>">Galeria</a><a class="<?php echo $moduleKey === 'sponsors' ? 'is-active' : ''; ?>" href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'sponsors'])); ?>">Patrocinadores</a><a href="<?php echo panel_h(panel_base_url(['view' => 'approvals'])); ?>">Revision</a></section><?php endif; ?>
            <section class="panel table-panel <?php echo !panel_is_admin() ? 'section-table' : ''; ?> <?php echo $isMarketplaceModule ? 'marketplace-table' : ''; ?>"><div class="panel-title-row"><div><h2><?php echo $isMarketplaceModule ? panel_h((string) ($marketplaceModules[$moduleKey][0] ?? 'Registros')) : (!panel_is_admin() ? 'Contenido registrado' : 'Registros'); ?></h2><p><?php echo panel_h((string) count($rows)); ?> elementos encontrados</p></div><?php if ($moduleKey === 'marketplace_leads'): ?><a class="button button--ghost" href="../business-proposal.php" target="_blank" rel="noopener">Formulario publico</a><?php else: ?><a class="button button--ghost" href="#form"><?php echo $isMarketplaceModule ? 'Crear nuevo' : panel_h($sectionMeta[3]); ?></a><?php endif; ?></div><table><thead><tr><th>ID</th><?php foreach ($currentModule['columns'] as $column): ?><th><?php echo panel_h(panel_column_label($column)); ?></th><?php endforeach; ?><th>Acciones</th></tr></thead><tbody>
                <?php foreach ($rows as $row): ?><tr data-search-row="<?php echo panel_h(strtolower(json_encode($row, JSON_UNESCAPED_UNICODE) ?: '')); ?>"><td>#<?php echo (int) $row['id']; ?></td><?php foreach ($currentModule['columns'] as $column): ?><td><?php echo $column === 'status' ? panel_badge((string) $row[$column]) : panel_h((string) ($row[$column] ?? '')); ?></td><?php endforeach; ?><td class="row-actions"><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => $moduleKey, 'edit' => (int) $row['id']])); ?>#form">Editar</a><?php if ($moduleKey === 'marketplace_leads' && panel_is_admin()): ?><form method="post" data-confirm="Aceptar esta propuesta y crear un negocio inactivo en marketplace?"><?php echo csrf_token_input(); ?><input type="hidden" name="panel_action" value="lead_convert"><input type="hidden" name="lead_id" value="<?php echo (int) $row['id']; ?>"><button type="submit">Aceptar</button></form><form method="post"><?php echo csrf_token_input(); ?><input type="hidden" name="panel_action" value="lead_status"><input type="hidden" name="lead_id" value="<?php echo (int) $row['id']; ?>"><input type="hidden" name="status" value="contacted"><button type="submit">Contactada</button></form><form method="post" data-confirm="Descartar esta propuesta?"><?php echo csrf_token_input(); ?><input type="hidden" name="panel_action" value="lead_status"><input type="hidden" name="lead_id" value="<?php echo (int) $row['id']; ?>"><input type="hidden" name="status" value="discarded"><button type="submit">Descartar</button></form><?php endif; ?><?php if ($moduleKey === 'events'): ?><a class="row-action-whatsapp" href="<?php echo panel_h(panel_event_whatsapp_url($row)); ?>" target="_blank" rel="noopener">WhatsApp</a><a class="row-action-whatsapp" href="<?php echo panel_h(panel_event_whatsapp_poll_url($row)); ?>" target="_blank" rel="noopener">WhatsApp encuesta</a><?php endif; ?><?php if ($moduleKey === 'users' && panel_is_admin()): ?><?php $nextStatus = ((string) ($row['status'] ?? 'active')) === 'blocked' ? 'active' : 'blocked'; ?><form method="post" data-confirm="<?php echo $nextStatus === 'blocked' ? 'Bloquear este usuario y cerrar sus sesiones?' : 'Activar este usuario?'; ?>"><?php echo csrf_token_input(); ?><input type="hidden" name="panel_action" value="user_status"><input type="hidden" name="user_id" value="<?php echo (int) $row['id']; ?>"><input type="hidden" name="status" value="<?php echo panel_h($nextStatus); ?>"><button type="submit"><?php echo $nextStatus === 'blocked' ? 'Bloquear' : 'Activar'; ?></button></form><?php endif; ?><form method="post" data-confirm="Eliminar registro?"><?php echo csrf_token_input(); ?><input type="hidden" name="panel_action" value="delete"><input type="hidden" name="module" value="<?php echo panel_h($moduleKey); ?>"><input type="hidden" name="id" value="<?php echo (int) $row['id']; ?>"><button>Eliminar</button></form></td></tr><?php endforeach; ?>
                <?php if (!$rows): ?><tr><td colspan="9">No hay registros todavia.</td></tr><?php endif; ?>
            </tbody></table></section>
            <?php if ($isMarketplaceModule): ?></div><div class="marketplace-manager__form"><?php endif; ?>
            <?php if ($moduleKey === 'marketplace_leads' && $editRow && panel_is_admin()): ?>
                <section class="panel form-panel marketplace-form">
                    <div class="panel-title-row">
                        <div>
                            <h2>Gestion de la propuesta</h2>
                            <p>Marca seguimiento, descarta o acepta la solicitud. Al aceptar se crea un negocio inactivo para revisar antes de publicarlo.</p>
                        </div>
                    </div>
                    <div class="marketplace-lead-detail">
                        <div><span>Negocio</span><strong><?php echo panel_h((string) ($editRow['business_name'] ?? '')); ?></strong></div>
                        <div><span>Contacto</span><strong><?php echo panel_h((string) ($editRow['contact_name'] ?? '')); ?></strong><small><?php echo panel_h((string) ($editRow['email'] ?? '')); ?></small></div>
                        <div><span>Telefono</span><strong><?php echo panel_h((string) (($editRow['phone'] ?? '') ?: 'No indicado')); ?></strong></div>
                        <div><span>Interes</span><strong><?php echo panel_h(panel_status_label((string) ($editRow['proposal_type'] ?? ''))); ?></strong></div>
                        <div class="marketplace-lead-detail__wide"><span>Propuesta</span><p><?php echo nl2br(panel_h((string) ($editRow['message'] ?? ''))); ?></p></div>
                    </div>
                    <form method="post" class="form-grid">
                        <?php echo csrf_token_input(); ?>
                        <input type="hidden" name="lead_id" value="<?php echo (int) $editRow['id']; ?>">
                        <label class="field field--wide">
                            <span>Notas internas</span>
                            <textarea name="admin_notes" rows="4" placeholder="Llamadas, presupuesto, condiciones, proximo paso..."><?php echo panel_h((string) ($editRow['admin_notes'] ?? '')); ?></textarea>
                        </label>
                        <div class="form-actions">
                            <button class="button" name="panel_action" value="lead_convert" type="submit">Aceptar y crear negocio</button>
                            <button class="button button--ghost" name="panel_action" value="lead_status" type="submit" onclick="this.form.status.value='contacted'">Marcar contactada</button>
                            <button class="button button--ghost" name="panel_action" value="lead_status" type="submit" onclick="this.form.status.value='qualified'">Marcar cualificada</button>
                            <button class="button button--ghost" name="panel_action" value="lead_status" type="submit" onclick="this.form.status.value='discarded'">Descartar</button>
                        </div>
                        <input type="hidden" name="status" value="<?php echo panel_h((string) ($editRow['status'] ?? 'new')); ?>">
                    </form>
                </section>
            <?php endif; ?>
            <?php if ($moduleKey === 'marketplace_leads' && !$editRow): ?>
                <section id="form" class="panel form-panel marketplace-form marketplace-empty-form">
                    <h2>Las propuestas entran desde la landing</h2>
                    <p>No hace falta crear propuestas manualmente aqui. Comparte el formulario publico y gestiona cada solicitud desde la tabla.</p>
                    <a class="button" href="../business-proposal.php" target="_blank" rel="noopener">Abrir formulario publico</a>
                </section>
            <?php elseif ($moduleKey !== 'marketplace_leads'): ?>
            <section id="form" class="panel form-panel <?php echo $moduleKey === 'commissions' ? 'form-panel--commission' : ''; ?> <?php echo !panel_is_admin() ? 'section-form' : ''; ?> <?php echo $isMarketplaceModule ? 'marketplace-form' : ''; ?>"><div class="panel-title-row"><div><h2><?php echo $editRow ? 'Editar' : 'Crear'; ?> <?php echo panel_h(!panel_is_admin() ? strtolower($sectionMeta[1]) : (string) $currentModule['singular']); ?></h2><p><?php echo $isMarketplaceModule ? 'Completa la ficha y guarda. Usa Inactivo para ocultarlo de la app sin borrarlo.' : (!panel_is_admin() ? 'Completa solo la informacion necesaria y guarda los cambios para revision.' : 'Formulario de gestion del modulo.'); ?></p></div></div><?php if ($moduleKey === 'commissions' && panel_is_admin()): ?><p class="form-note">El usuario asignado podra entrar desde el login en "Panel de gestion". Si no hay usuario asignado, esa comision no tendra acceso privado.</p><?php endif; ?><form method="post" enctype="multipart/form-data" class="form-grid <?php echo $isMarketplaceModule ? 'form-grid--marketplace' : ''; ?>"><?php echo csrf_token_input(); ?><input type="hidden" name="panel_action" value="save"><input type="hidden" name="module" value="<?php echo panel_h($moduleKey); ?>"><input type="hidden" name="id" value="<?php echo (int) ($editRow['id'] ?? 0); ?>">
                <?php foreach ($currentModule['fields'] as $field): ?><?php $name = $field['name']; $type = $field['type']; $value = (string) ($editRow[$name] ?? ($type === 'status' ? 'draft' : '')); ?>
                    <label class="field field--<?php echo $type === 'textarea' ? 'wide' : 'normal'; ?>"><span><?php echo panel_h($field['label']); ?></span>
                        <?php if ($type === 'textarea'): ?><textarea name="<?php echo panel_h($name); ?>" rows="4"><?php echo panel_h($value); ?></textarea>
                        <?php elseif ($type === 'select' || $type === 'status'): ?><select name="<?php echo panel_h($name); ?>"><?php $options = $type === 'status' ? ($field['options'] ?? ['draft' => 'Borrador', 'pending' => 'Pendiente revision', 'published' => 'Publicado', 'rejected' => 'Rechazado']) : ($field['options'] ?? []); foreach ($options as $key => $label): ?><option value="<?php echo panel_h((string) $key); ?>" <?php echo $value === (string) $key ? 'selected' : ''; ?>><?php echo panel_h((string) $label); ?></option><?php endforeach; ?></select>
                        <?php elseif ($type === 'commission'): ?><select name="<?php echo panel_h($name); ?>" <?php echo !panel_is_admin() ? 'disabled' : ''; ?>><?php foreach ($commissionOptions as $commission): ?><option value="<?php echo (int) $commission['id']; ?>" <?php echo (int) $value === (int) $commission['id'] ? 'selected' : ''; ?>><?php echo panel_h($commission['name']); ?></option><?php endforeach; ?></select><?php if (!panel_is_admin()): ?><input type="hidden" name="<?php echo panel_h($name); ?>" value="<?php echo (int) ($myCommissionId ?? 0); ?>"><?php endif; ?>
                        <?php elseif ($type === 'user_assignment'): ?><?php $assignedUserId = (int) ($editRow['assigned_user_id'] ?? 0); ?><select name="<?php echo panel_h($name); ?>" <?php echo !panel_is_admin() ? 'disabled' : ''; ?>><option value="">Sin usuario asignado</option><?php foreach (panel_user_options_for_commission_assignment((int) ($editRow['id'] ?? 0)) as $option): ?><?php $optionCommissionId = (int) ($option['commission_id'] ?? 0); $optionCommission = $optionCommissionId > 0 ? ' · ahora en ' . (string) ($option['commission_name'] ?? ('comision #' . $optionCommissionId)) : ' · sin comision'; ?><option value="<?php echo (int) $option['id']; ?>" <?php echo $assignedUserId === (int) $option['id'] ? 'selected' : ''; ?>><?php echo panel_h($option['name'] . ' · ' . $option['email'] . $optionCommission); ?></option><?php endforeach; ?></select><small>Se muestran todos los usuarios activos no administradores. Si eliges uno ya asignado, se movera a esta comision.</small>
                        <?php elseif ($type === 'file'): ?><input type="file" name="<?php echo panel_h($name); ?>" accept="image/*"><?php if ($value): ?><small>Actual: <?php echo panel_h($value); ?></small><?php endif; ?>
                        <?php else: ?><input type="<?php echo panel_h($type); ?>" name="<?php echo panel_h($name); ?>" value="<?php echo panel_h($value); ?>" <?php echo isset($field['step']) ? 'step="' . panel_h($field['step']) . '"' : ''; ?> <?php echo !empty($field['required']) ? 'required' : ''; ?>><?php endif; ?>
                    </label>
                <?php endforeach; ?><div class="form-actions"><button class="button" type="submit">Guardar</button><button class="button button--ghost" type="button" data-preview>Vista previa</button></div></form></section>
            <?php endif; ?>
            <?php if ($isMarketplaceModule): ?></div></section><?php endif; ?>
        <?php elseif ($view === 'approvals'): ?>
            <section class="page-head"><div><span>Revision</span><h1>Cola de aprobaciones</h1><p>Aprobar o rechazar cambios con motivo visible para la comision.</p></div></section>
            <section class="panel table-panel"><table><thead><tr><th>Contenido</th><th>Comision</th><th>Estado</th><th>Solicitado</th><th>Revision</th></tr></thead><tbody><?php foreach (panel_approval_rows() as $approval): ?><tr><td><?php echo panel_h($approval['entity_type']); ?> #<?php echo (int) $approval['entity_id']; ?></td><td><?php echo panel_h($approval['commission_name'] ?? 'General'); ?></td><td><?php echo panel_badge((string) $approval['status']); ?></td><td><?php echo panel_h($approval['requested_at']); ?></td><td><?php if (panel_is_admin() && $approval['status'] === 'pending'): ?><form method="post" class="review-form"><?php echo csrf_token_input(); ?><input type="hidden" name="panel_action" value="review"><input type="hidden" name="approval_id" value="<?php echo (int) $approval['id']; ?>"><input name="reason" placeholder="Motivo si rechazas"><button name="decision" value="approve">Aprobar</button><button name="decision" value="reject">Rechazar</button></form><?php else: ?><?php echo panel_h($approval['rejection_reason'] ?? 'Revisado'); ?><?php endif; ?></td></tr><?php endforeach; ?></tbody></table></section>
        <?php elseif (in_array($view, ['monuments', 'news', 'documents'], true)): ?>
            <?php $sectionMeta = panel_commission_section_meta($view); ?>
            <section class="page-head page-head--section"><div><span><?php echo panel_h($sectionMeta[0]); ?></span><h1><?php echo panel_h($sectionMeta[1]); ?></h1><p><?php echo panel_h($sectionMeta[2]); ?></p></div><a class="button" href="<?php echo panel_h($view === 'monuments' ? panel_base_url(['view' => 'module', 'module' => 'gallery']) : panel_base_url(['view' => 'messages'])); ?>"><?php echo panel_h($sectionMeta[3]); ?></a></section>
            <section class="section-hub"><article class="panel"><h2>Estado del apartado</h2><p>Este apartado queda separado en la navegacion para que la comision tenga claro donde trabajar. Los datos se guardan usando los modulos actuales hasta que activemos su tabla propia.</p></article><article class="panel"><h2>Acciones disponibles</h2><div class="quick-actions"><a href="<?php echo panel_h(panel_base_url(['view' => 'module', 'module' => 'gallery'])); ?>"><strong><?php echo $view === 'monuments' ? 'Subir imagenes' : 'Galeria'; ?></strong><small>Contenido visual</small></a><a href="<?php echo panel_h(panel_base_url(['view' => 'messages'])); ?>"><strong><?php echo $view === 'documents' ? 'Avisar al admin' : 'Enviar comunicado'; ?></strong><small>App, WhatsApp o email</small></a><a href="<?php echo panel_h(panel_base_url(['view' => 'approvals'])); ?>"><strong>Ver revision</strong><small>Estado de cambios</small></a><a href="<?php echo panel_h(panel_base_url()); ?>"><strong>Dashboard</strong><small>Volver al resumen</small></a></div></article></section>
        <?php elseif ($view === 'stats'): ?>
            <?php $statsScope = panel_is_admin() ? '' : ' AND commission_id = :commission_id'; $statsParams = panel_is_admin() ? [] : ['commission_id' => $myCommissionId ?? 0]; ?>
            <section class="page-head"><div><span>Analitica</span><h1>Estadisticas</h1><p>Visitas, contenido consultado, rutas y pendientes de aprobacion.</p></div></section><section class="metrics-grid"><?php panel_metric('Visitas por comision', (string) panel_count('stats', "metric = 'commission_view'" . $statsScope, $statsParams), '👁'); panel_metric('Eventos mas vistos', (string) panel_count('stats', "entity_type = 'events'" . $statsScope, $statsParams), '📅'); panel_metric('Galeria consultada', (string) panel_count('stats', "entity_type = 'gallery'" . $statsScope, $statsParams), '🖼'); panel_metric('Pendiente aprobacion', (string) $pendingCount, '✅'); ?></section>
        <?php elseif ($view === 'messages'): ?>
            <section class="page-head"><div><span>Avisos multicanal</span><h1>Mensajes y notificaciones</h1><p>Envia avisos dentro de la app y prepara el mismo mensaje para WhatsApp o email.</p></div></section>
            <?php if (panel_is_admin()): ?>
                <section class="panel form-panel notice-composer"><form method="post" class="form-grid"><?php echo csrf_token_input(); ?><input type="hidden" name="panel_action" value="message"><label class="field"><span>Comision</span><select name="commission_id"><option value="">Todas las comisiones activas</option><?php foreach ($commissionOptions as $commission): ?><option value="<?php echo (int) $commission['id']; ?>"><?php echo panel_h($commission['name']); ?></option><?php endforeach; ?></select></label><label class="field"><span>Telefono WhatsApp manual</span><input name="whatsapp_phone" placeholder="Opcional si no esta en la ficha"></label><label class="field"><span>Asunto</span><input name="subject" required></label><label class="field"><span>Canales</span><span class="channel-grid"><label><input type="checkbox" name="channels[]" value="internal" checked> App</label><label><input type="checkbox" name="channels[]" value="whatsapp"> WhatsApp</label><label><input type="checkbox" name="channels[]" value="email"> Email</label></span></label><label class="field field--wide"><span>Mensaje</span><textarea name="message" rows="5" required placeholder="Escribe el aviso para la comision..."></textarea></label><div class="form-actions"><button class="button" type="submit">Preparar / enviar aviso</button></div></form></section>
            <?php endif; ?>
            <section class="panel table-panel"><table><thead><tr><th>Titulo</th><th>Mensaje</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody><?php $notifications = db()->prepare('SELECT * FROM notifications WHERE (:admin = 1 OR commission_id = :commission_id OR user_id = :user_id) ORDER BY created_at DESC LIMIT 100'); $notifications->execute(['admin' => panel_is_admin() ? 1 : 0, 'commission_id' => $myCommissionId ?? 0, 'user_id' => (int) $user['id']]); foreach ($notifications->fetchAll() as $notification): ?><tr><td><?php echo panel_h($notification['title']); ?></td><td><?php echo panel_h($notification['message']); ?></td><td><?php echo panel_h($notification['created_at']); ?></td><td class="row-actions"><form method="post" data-confirm="Eliminar este aviso?"><?php echo csrf_token_input(); ?><input type="hidden" name="panel_action" value="delete_notice"><input type="hidden" name="notification_id" value="<?php echo (int) $notification['id']; ?>"><button type="submit">Eliminar</button></form></td></tr><?php endforeach; ?></tbody></table></section>
        <?php else: ?>
            <section class="page-head"><div><span>Ajustes</span><h1>Configuracion</h1><p>Cambia contrasena desde Usuarios, revisa publicaciones, avisos y actividad.</p></div></section><section class="panel"><h2>Preparado para API futura</h2><p>La estructura separa modulos, repositorio, vistas y SQL para evolucionar a endpoints JSON o app movil.</p></section>
        <?php endif; ?>
    </div>
</div>
<div class="overlay" data-sidebar-overlay></div>
<dialog id="preview-dialog"><button data-close-preview>×</button><h2>Vista previa</h2><div data-preview-content></div></dialog>
<dialog id="confirm-dialog" class="confirm-dialog"><form method="dialog"><button class="confirm-dialog__close" value="cancel" aria-label="Cerrar">×</button></form><div class="confirm-dialog__icon">!</div><h2>Confirmar accion</h2><p data-confirm-message>Quieres continuar?</p><div class="confirm-dialog__actions"><button class="button button--ghost" type="button" data-confirm-cancel>Cancelar</button><button class="button" type="button" data-confirm-accept>Eliminar</button></div></dialog>
<script src="./assets/panel.js"></script>
</body>
</html>
