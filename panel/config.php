<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/bootstrap.php';

const PANEL_STATUSES = ['draft', 'pending', 'published', 'rejected'];

function panel_user(): ?array
{
    return current_user();
}

function panel_role(): string
{
    $user = panel_user();
    return strtolower((string) ($user['role'] ?? 'guest')) === 'admin' ? 'admin' : 'commission';
}

function panel_is_admin(): bool
{
    return panel_role() === 'admin';
}

function panel_require_auth(): void
{
    require_authentication();
    $user = panel_user();
    if (($user['type'] ?? '') === 'guest') {
        redirect_to('../login.php?target=panel');
    }

    if (!panel_is_admin() && !panel_has_active_commission()) {
        redirect_to('../login.php?target=panel&panel_denied=1');
    }
}

function panel_h(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function panel_base_url(array $params = []): string
{
    $query = $params ? '?' . http_build_query($params) : '';
    return './index.php' . $query;
}

function panel_upload_file(string $field): ?string
{
    if (!isset($_FILES[$field]) || !is_array($_FILES[$field]) || ($_FILES[$field]['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ((int) $_FILES[$field]['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('No se pudo subir la imagen.');
    }

    $tmp = (string) $_FILES[$field]['tmp_name'];
    $name = (string) $_FILES[$field]['name'];
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
        throw new RuntimeException('Formato de imagen no permitido.');
    }

    $fileName = date('YmdHis') . '-' . bin2hex(random_bytes(5)) . '.' . $ext;
    $target = __DIR__ . '/uploads/' . $fileName;
    if (!move_uploaded_file($tmp, $target)) {
        throw new RuntimeException('No se pudo guardar la imagen.');
    }

    return 'uploads/' . $fileName;
}

function panel_flash(?string $message = null, string $type = 'success'): ?array
{
    if ($message !== null) {
        $_SESSION['panel_flash'] = ['message' => $message, 'type' => $type];
        return null;
    }

    $flash = $_SESSION['panel_flash'] ?? null;
    unset($_SESSION['panel_flash']);
    return is_array($flash) ? $flash : null;
}

function panel_log(string $action, ?string $entityType = null, ?int $entityId = null, ?string $details = null): void
{
    try {
        $user = panel_user() ?? [];
        $statement = db()->prepare('INSERT INTO activity_logs (user_id, commission_id, action, entity_type, entity_id, details, ip_address) VALUES (:user_id, :commission_id, :action, :entity_type, :entity_id, :details, :ip)');
        $statement->execute([
            'user_id' => (int) ($user['id'] ?? 0) ?: null,
            'commission_id' => panel_current_commission_id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'details' => $details,
            'ip' => client_ip_address(),
        ]);
    } catch (Throwable) {
    }
}

function panel_current_commission_id(): ?int
{
    $user = panel_user() ?? [];
    if (isset($user['commission_id']) && (int) $user['commission_id'] > 0) {
        return (int) $user['commission_id'];
    }

    try {
        $statement = db()->prepare('SELECT commission_id FROM users WHERE id = :id LIMIT 1');
        $statement->execute(['id' => (int) ($user['id'] ?? 0)]);
        $value = (int) ($statement->fetchColumn() ?: 0);
        return $value > 0 ? $value : null;
    } catch (Throwable) {
        return null;
    }
}

function panel_has_active_commission(): bool
{
    $commissionId = panel_current_commission_id();
    if ($commissionId === null || $commissionId <= 0) {
        return false;
    }

    try {
        $statement = db()->prepare("SELECT COUNT(*) FROM commissions WHERE id = :id AND status = 'active'");
        $statement->execute(['id' => $commissionId]);
        return (int) ($statement->fetchColumn() ?: 0) > 0;
    } catch (Throwable) {
        return false;
    }
}
