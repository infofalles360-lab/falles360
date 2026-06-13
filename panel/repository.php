<?php
declare(strict_types=1);

function panel_commissions_options(): array
{
    panel_ensure_marketplace_tables();
    return db()->query('SELECT id, name FROM commissions ORDER BY name ASC')->fetchAll() ?: [];
}

function panel_ensure_marketplace_tables(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;

    db()->exec("CREATE TABLE IF NOT EXISTS marketplace_businesses (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        type VARCHAR(90) DEFAULT '',
        location VARCHAR(120) DEFAULT '',
        distance VARCHAR(60) DEFAULT '',
        promotion TEXT NULL,
        action_label VARCHAR(80) DEFAULT 'Ver oferta',
        badge VARCHAR(40) DEFAULT 'Destacado',
        category VARCHAR(80) DEFAULT 'Restaurantes',
        image_url TEXT NULL,
        plan VARCHAR(80) DEFAULT 'Basico',
        phone VARCHAR(80) DEFAULT '',
        email VARCHAR(190) DEFAULT '',
        whatsapp VARCHAR(80) DEFAULT '',
        website VARCHAR(255) DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_marketplace_businesses_status (status),
        INDEX idx_marketplace_businesses_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    foreach ([
        "ALTER TABLE marketplace_businesses ADD COLUMN phone VARCHAR(80) DEFAULT '' AFTER plan",
        "ALTER TABLE marketplace_businesses ADD COLUMN email VARCHAR(190) DEFAULT '' AFTER phone",
        "ALTER TABLE marketplace_businesses ADD COLUMN whatsapp VARCHAR(80) DEFAULT '' AFTER email",
        "ALTER TABLE marketplace_businesses ADD COLUMN website VARCHAR(255) DEFAULT '' AFTER whatsapp",
    ] as $sql) {
        try {
            db()->exec($sql);
        } catch (Throwable $exception) {
            // La columna ya existe en instalaciones actualizadas.
        }
    }

    db()->exec("CREATE TABLE IF NOT EXISTS marketplace_filters (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(90) NOT NULL,
        category VARCHAR(90) NOT NULL,
        section_id VARCHAR(120) DEFAULT '',
        sort_order INT NOT NULL DEFAULT 100,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_marketplace_filters_status (status),
        INDEX idx_marketplace_filters_order (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    db()->exec("CREATE TABLE IF NOT EXISTS marketplace_settings (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(80) NOT NULL UNIQUE,
        setting_value TEXT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_marketplace_settings_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    db()->exec("CREATE TABLE IF NOT EXISTS marketplace_coupons (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(190) NOT NULL,
        business VARCHAR(190) NOT NULL,
        condition_text TEXT NULL,
        valid_until VARCHAR(120) DEFAULT '',
        action_label VARCHAR(80) DEFAULT 'Usar cupon',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_marketplace_coupons_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    db()->exec("CREATE TABLE IF NOT EXISTS marketplace_products (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        price VARCHAR(80) DEFAULT '',
        category VARCHAR(100) DEFAULT '',
        image_url TEXT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_marketplace_products_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    db()->exec("CREATE TABLE IF NOT EXISTS marketplace_experiences (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        description TEXT NULL,
        price VARCHAR(80) DEFAULT '',
        action_label VARCHAR(80) DEFAULT 'Reservar',
        location VARCHAR(120) DEFAULT '',
        duration VARCHAR(80) DEFAULT '',
        capacity VARCHAR(80) DEFAULT '',
        business_name VARCHAR(190) DEFAULT '',
        image_url TEXT NULL,
        contact_channel VARCHAR(120) DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_marketplace_experiences_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    foreach ([
        "ALTER TABLE marketplace_experiences ADD COLUMN location VARCHAR(120) DEFAULT '' AFTER action_label",
        "ALTER TABLE marketplace_experiences ADD COLUMN duration VARCHAR(80) DEFAULT '' AFTER location",
        "ALTER TABLE marketplace_experiences ADD COLUMN capacity VARCHAR(80) DEFAULT '' AFTER duration",
        "ALTER TABLE marketplace_experiences ADD COLUMN business_name VARCHAR(190) DEFAULT '' AFTER capacity",
        "ALTER TABLE marketplace_experiences ADD COLUMN image_url TEXT NULL AFTER business_name",
        "ALTER TABLE marketplace_experiences ADD COLUMN contact_channel VARCHAR(120) DEFAULT '' AFTER image_url",
    ] as $sql) {
        try {
            db()->exec($sql);
        } catch (Throwable $exception) {
            // La columna ya existe en instalaciones actualizadas.
        }
    }

    db()->exec("CREATE TABLE IF NOT EXISTS marketplace_leads (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        business_name VARCHAR(190) NOT NULL,
        contact_name VARCHAR(190) NOT NULL,
        email VARCHAR(190) NOT NULL,
        phone VARCHAR(60) DEFAULT '',
        business_type VARCHAR(90) DEFAULT '',
        location VARCHAR(160) DEFAULT '',
        proposal_type VARCHAR(90) DEFAULT '',
        message TEXT NULL,
        source VARCHAR(90) DEFAULT 'landing',
        status VARCHAR(30) NOT NULL DEFAULT 'new',
        admin_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_marketplace_leads_status (status),
        INDEX idx_marketplace_leads_email (email),
        INDEX idx_marketplace_leads_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // No se insertan filtros, textos ni ofertas por defecto: el marketplace
    // debe mostrarse vacio hasta que el administrador publique contenido real.
}

function panel_user_options_for_commission_assignment(?int $commissionId = null): array
{
    if (!panel_is_admin()) {
        return [];
    }

    $statement = db()->prepare(
        "SELECT users.id, users.name, users.email, users.commission_id, users.status, commissions.name AS commission_name
         FROM users
         LEFT JOIN commissions ON commissions.id = users.commission_id
         WHERE users.role <> 'admin'
           AND users.status = 'active'
         ORDER BY users.name ASC, users.email ASC"
    );
    $statement->execute();

    return $statement->fetchAll() ?: [];
}

function panel_module(string $key): array
{
    panel_ensure_marketplace_tables();
    $modules = panel_modules();
    if (!isset($modules[$key])) {
        redirect_to(panel_base_url());
    }
    if (($modules[$key]['admin_only'] ?? false) && !panel_is_admin()) {
        redirect_to(panel_base_url());
    }
    return $modules[$key];
}

function panel_can_access_row(array $row): bool
{
    if (panel_is_admin()) {
        return true;
    }
    $commissionId = panel_current_commission_id();
    if (array_key_exists('commission_id', $row)) {
        return $commissionId !== null && (int) ($row['commission_id'] ?? 0) === $commissionId;
    }

    if (array_key_exists('id', $row)) {
        return $commissionId !== null && (int) ($row['id'] ?? 0) === $commissionId;
    }

    return $commissionId !== null && (int) ($row['commission_id'] ?? 0) === $commissionId;
}

function panel_rows(string $moduleKey, string $search = ''): array
{
    $module = panel_module($moduleKey);
    $table = $module['table'];
    $where = [];
    $params = [];
    $select = '*';

    if ($moduleKey === 'commissions') {
        $select = "commissions.*,
            COALESCE(
                (SELECT users.name FROM users WHERE users.commission_id = commissions.id ORDER BY users.id ASC LIMIT 1),
                'Sin usuario asignado'
            ) AS assigned_user";
    } elseif ($moduleKey === 'users') {
        $select = "users.*, COALESCE(commissions.name, 'Sin comision') AS commission_name";
        $table = 'users LEFT JOIN commissions ON commissions.id = users.commission_id';
    }

    if (!panel_is_admin() && $moduleKey === 'commissions') {
        $where[] = 'id = :commission_id';
        $params['commission_id'] = panel_current_commission_id() ?? 0;
    } elseif (!panel_is_admin() && in_array('commission_id', array_column($module['fields'], 'name'), true)) {
        $where[] = 'commission_id = :commission_id';
        $params['commission_id'] = panel_current_commission_id() ?? 0;
    }

    if ($search !== '') {
        $searchParts = [];
        foreach ($module['columns'] as $column) {
            if ($moduleKey === 'commissions' && $column === 'assigned_user') {
                $searchParts[] = "EXISTS (
                    SELECT 1 FROM users
                    WHERE users.commission_id = commissions.id
                      AND (users.name LIKE :search OR users.email LIKE :search)
                )";
                continue;
            }
            if ($moduleKey === 'users' && $column === 'commission_name') {
                $searchParts[] = 'CAST(commissions.name AS CHAR) LIKE :search';
                continue;
            }
            $qualifiedColumn = in_array($moduleKey, ['users', 'commissions'], true) ? $module['table'] . '.' . $column : $column;
            $searchParts[] = sprintf('CAST(%s AS CHAR) LIKE :search', $qualifiedColumn);
        }
        $where[] = '(' . implode(' OR ', $searchParts) . ')';
        $params['search'] = '%' . $search . '%';
    }

    $orderTable = in_array($moduleKey, ['users', 'commissions'], true) ? $module['table'] . '.' : '';
    $sql = 'SELECT ' . $select . ' FROM ' . $table . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY ' . $orderTable . 'updated_at DESC, ' . $orderTable . 'id DESC LIMIT 200';
    $statement = db()->prepare($sql);
    $statement->execute($params);
    return $statement->fetchAll() ?: [];
}

function panel_find(string $moduleKey, int $id): ?array
{
    $module = panel_module($moduleKey);
    $select = '*';
    if ($moduleKey === 'commissions') {
        $select = "commissions.*,
            (SELECT users.id FROM users WHERE users.commission_id = commissions.id ORDER BY users.id ASC LIMIT 1) AS assigned_user_id,
            COALESCE(
                (SELECT users.name FROM users WHERE users.commission_id = commissions.id ORDER BY users.id ASC LIMIT 1),
                'Sin usuario asignado'
            ) AS assigned_user";
    }
    $statement = db()->prepare('SELECT ' . $select . ' FROM ' . $module['table'] . ' WHERE id = :id LIMIT 1');
    $statement->execute(['id' => $id]);
    $row = $statement->fetch();
    return $row && panel_can_access_row($row) ? $row : null;
}

function panel_save(string $moduleKey, array $post, array $files): int
{
    $post = app_sanitize_input_array($post, ['trim' => false]);
    $module = panel_module($moduleKey);
    $table = $module['table'];
    $id = (int) ($post['id'] ?? 0);
    $data = [];
    $existing = $id > 0 ? panel_find($moduleKey, $id) : null;

    foreach ($module['fields'] as $field) {
        $name = $field['name'];
        if ($field['type'] === 'user_assignment') {
            continue;
        }
        if ($name === 'password' && trim((string) ($post[$name] ?? '')) === '') {
            continue;
        }
        if ($field['type'] === 'file') {
            $uploaded = panel_upload_file($name);
            if ($uploaded !== null) {
                $data[$name] = $uploaded;
            } elseif ($existing && isset($existing[$name])) {
                $data[$name] = $existing[$name];
            }
            continue;
        }
        if ($field['type'] === 'status') {
            $requested = (string) ($post[$name] ?? 'draft');
            $data[$name] = panel_is_admin() ? $requested : ($requested === 'draft' ? 'draft' : 'pending');
            continue;
        }
        if ($field['type'] === 'commission' && !panel_is_admin()) {
            $data[$name] = panel_current_commission_id();
            continue;
        }
        if ($name === 'password') {
            $data[$name] = password_hash((string) $post[$name], PASSWORD_DEFAULT);
            continue;
        }
        $data[$name] = app_validate_string($post[$name] ?? '', $name, [
            'allow_empty' => true,
            'max' => 5000,
        ]);
    }

    if ($moduleKey === 'marketplace_leads' && trim((string) ($data['status'] ?? '')) === '') {
        $data['status'] = 'new';
    }

    if ($moduleKey === 'events' && array_key_exists('category_id', panel_table_columns('events'))) {
        $data['category_id'] = panel_event_category_id((string) ($post['event_type'] ?? 'otro'));
    }

    $tableColumns = panel_table_columns($table);
    foreach (array_keys($data) as $column) {
        if (!isset($tableColumns[$column])) {
            unset($data[$column]);
        }
    }

    if ($table !== 'commissions' && array_key_exists('created_by', panel_table_columns($table)) && $id === 0) {
        $data['created_by'] = (int) (panel_user()['id'] ?? 0);
    }
    if ($table === 'users' && isset($data['role'])) {
        $roleId = db()->prepare('SELECT id FROM roles WHERE name = :name LIMIT 1');
        $roleId->execute(['name' => $data['role']]);
        $data['role_id'] = (int) ($roleId->fetchColumn() ?: 0) ?: null;
    }

    if ($table === 'users' && isset($data['status'])) {
        panel_assert_can_change_user_status($id, (string) $data['status']);
    }

    if ($id > 0) {
        $assignments = [];
        foreach ($data as $column => $value) {
            $assignments[] = $column . ' = :' . $column;
        }
        $data['id'] = $id;
        $statement = db()->prepare('UPDATE ' . $table . ' SET ' . implode(', ', $assignments) . ' WHERE id = :id');
        $statement->execute($data);
        if ($table === 'users' && isset($data['status'])) {
            panel_after_user_status_change($id, (string) $data['status']);
        }
        if ($moduleKey === 'commissions') {
            panel_assign_commission_user($id, (int) ($post['assigned_user_id'] ?? 0));
        }
        panel_log('updated', $table, $id);
        panel_register_approval($moduleKey, $id, $data['status'] ?? null);
        return $id;
    }

    $columns = array_keys($data);
    $statement = db()->prepare('INSERT INTO ' . $table . ' (' . implode(', ', $columns) . ') VALUES (:' . implode(', :', $columns) . ')');
    $statement->execute($data);
    $newId = (int) db()->lastInsertId();
    if ($table === 'users' && isset($data['status'])) {
        panel_after_user_status_change($newId, (string) $data['status']);
    }
    if ($moduleKey === 'commissions') {
        panel_assign_commission_user($newId, (int) ($post['assigned_user_id'] ?? 0));
    }
    panel_log('created', $table, $newId);
    panel_register_approval($moduleKey, $newId, $data['status'] ?? null);
    return $newId;
}

function panel_assign_commission_user(int $commissionId, int $userId): void
{
    if (!panel_is_admin() || $commissionId <= 0) {
        return;
    }

    db()->prepare("UPDATE users SET commission_id = NULL WHERE commission_id = :commission_id AND role <> 'admin'")
        ->execute(['commission_id' => $commissionId]);

    if ($userId <= 0) {
        panel_log('commission_user_unassigned', 'commissions', $commissionId, 'Comision sin usuario gestor asignado.');
        return;
    }

    $statement = db()->prepare("SELECT id FROM users WHERE id = :id AND role <> 'admin' AND status = 'active' LIMIT 1");
    $statement->execute(['id' => $userId]);

    if (!$statement->fetchColumn()) {
        throw new RuntimeException('El usuario seleccionado no esta disponible para asignarlo a una comision.');
    }

    db()->prepare('UPDATE users SET commission_id = :commission_id WHERE id = :id')->execute([
        'commission_id' => $commissionId,
        'id' => $userId,
    ]);

    panel_log('commission_user_assigned', 'commissions', $commissionId, 'Usuario asignado como gestor de la comision.');
}

function panel_marketplace_lead(int $leadId): array
{
    if (!panel_is_admin()) {
        throw new RuntimeException('Solo administracion puede gestionar propuestas.');
    }

    panel_ensure_marketplace_tables();
    $statement = db()->prepare('SELECT * FROM marketplace_leads WHERE id = :id LIMIT 1');
    $statement->execute(['id' => $leadId]);
    $lead = $statement->fetch();

    if (!is_array($lead)) {
        throw new RuntimeException('Propuesta no encontrada.');
    }

    return $lead;
}

function panel_update_marketplace_lead_status(int $leadId, string $status, string $notes = ''): void
{
    $allowed = ['new', 'contacted', 'qualified', 'converted', 'discarded'];
    if (!in_array($status, $allowed, true)) {
        throw new RuntimeException('Estado de propuesta no permitido.');
    }

    $lead = panel_marketplace_lead($leadId);
    $adminNotes = trim($notes);
    if ($adminNotes === '') {
        $adminNotes = (string) ($lead['admin_notes'] ?? '');
    }

    db()->prepare('UPDATE marketplace_leads SET status = :status, admin_notes = :admin_notes WHERE id = :id')
        ->execute([
            'status' => $status,
            'admin_notes' => $adminNotes,
            'id' => $leadId,
        ]);

    panel_log('lead_status_' . $status, 'marketplace_leads', $leadId, 'Estado de propuesta actualizado.');
}

function panel_convert_marketplace_lead(int $leadId, string $notes = ''): int
{
    $lead = panel_marketplace_lead($leadId);

    if ((string) ($lead['status'] ?? '') === 'converted') {
        throw new RuntimeException('Esta propuesta ya fue convertida.');
    }

    $category = match ((string) ($lead['proposal_type'] ?? '')) {
        'cupon' => 'Cupones',
        'producto' => 'Merchandising',
        'experiencia' => 'Experiencias',
        'sponsor' => 'Sponsors',
        default => 'Restaurantes',
    };

    $businessName = trim((string) ($lead['business_name'] ?? ''));
    if ($businessName === '') {
        throw new RuntimeException('La propuesta no tiene nombre de negocio.');
    }

    $insert = db()->prepare(
        'INSERT INTO marketplace_businesses (
            name,
            type,
            location,
            distance,
            promotion,
            action_label,
            badge,
            category,
            plan,
            phone,
            email,
            whatsapp,
            website,
            status
        ) VALUES (
            :name,
            :type,
            :location,
            :distance,
            :promotion,
            :action_label,
            :badge,
            :category,
            :plan,
            :phone,
            :email,
            :whatsapp,
            :website,
            :status
        )'
    );
    $insert->execute([
        'name' => $businessName,
        'type' => trim((string) ($lead['business_type'] ?? '')),
        'location' => trim((string) ($lead['location'] ?? '')),
        'distance' => '',
        'promotion' => trim((string) ($lead['message'] ?? '')),
        'action_label' => 'Ver propuesta',
        'badge' => $category === 'Sponsors' ? 'Sponsor' : 'Destacado',
        'category' => $category,
        'plan' => $category === 'Sponsors' ? 'Premium/Fallas Boost' : 'Basico',
        'phone' => trim((string) ($lead['phone'] ?? '')),
        'email' => trim((string) ($lead['email'] ?? '')),
        'whatsapp' => trim((string) ($lead['phone'] ?? '')),
        'website' => '',
        'status' => 'inactive',
    ]);
    $businessId = (int) db()->lastInsertId();

    $adminNotes = trim($notes);
    if ($adminNotes === '') {
        $adminNotes = trim((string) ($lead['admin_notes'] ?? ''));
    }
    $conversionNote = 'Convertida en negocio marketplace #' . $businessId . '.';
    $adminNotes = trim($adminNotes !== '' ? $adminNotes . "\n" . $conversionNote : $conversionNote);

    db()->prepare('UPDATE marketplace_leads SET status = :status, admin_notes = :admin_notes WHERE id = :id')
        ->execute([
            'status' => 'converted',
            'admin_notes' => $adminNotes,
            'id' => $leadId,
        ]);

    panel_log('lead_converted', 'marketplace_leads', $leadId, $conversionNote);
    panel_log('created_from_lead', 'marketplace_businesses', $businessId, 'Negocio creado desde propuesta #' . $leadId . '.');

    return $businessId;
}

function panel_assert_can_change_user_status(int $userId, string $status): void
{
    if (!panel_is_admin()) {
        throw new RuntimeException('Solo administracion puede cambiar el estado de usuarios.');
    }

    if (!in_array($status, ['active', 'blocked'], true)) {
        throw new RuntimeException('Estado de usuario no permitido.');
    }

    $currentUserId = (int) (panel_user()['id'] ?? 0);
    if ($userId > 0 && $userId === $currentUserId && $status !== 'active') {
        throw new RuntimeException('No puedes bloquear tu propio usuario administrador.');
    }
}

function panel_after_user_status_change(int $userId, string $status): void
{
    if ($userId <= 0 || $status === 'active') {
        return;
    }

    panel_revoke_user_sessions($userId);
    panel_log('user_blocked', 'users', $userId, 'Usuario bloqueado desde el panel de administracion.');
}

function panel_revoke_user_sessions(int $userId): void
{
    if ($userId <= 0) {
        return;
    }

    $columns = panel_table_columns('user_sessions');
    if (isset($columns['revoked_at'])) {
        $sql = 'UPDATE user_sessions SET revoked_at = NOW()';
        if (isset($columns['updated_at'])) {
            $sql .= ', updated_at = CURRENT_TIMESTAMP';
        }
        $sql .= ' WHERE user_id = :user_id AND revoked_at IS NULL';
        db()->prepare($sql)->execute(['user_id' => $userId]);
        return;
    }

    db()->prepare('DELETE FROM user_sessions WHERE user_id = :user_id')->execute(['user_id' => $userId]);
}

function panel_set_user_status(int $userId, string $status): void
{
    panel_assert_can_change_user_status($userId, $status);

    $statement = db()->prepare('SELECT id, status FROM users WHERE id = :id LIMIT 1');
    $statement->execute(['id' => $userId]);
    $user = $statement->fetch();

    if (!$user) {
        throw new RuntimeException('Usuario no encontrado.');
    }

    db()->prepare('UPDATE users SET status = :status WHERE id = :id')->execute([
        'status' => $status,
        'id' => $userId,
    ]);

    panel_after_user_status_change($userId, $status);
    if ($status === 'active') {
        panel_log('user_activated', 'users', $userId, 'Usuario activado desde el panel de administracion.');
    }
}

function panel_table_columns(string $table): array
{
    static $cache = [];
    if (isset($cache[$table])) {
        return $cache[$table];
    }
    $columns = [];
    foreach (db()->query('SHOW COLUMNS FROM ' . $table)->fetchAll() as $column) {
        $columns[(string) $column['Field']] = true;
    }
    return $cache[$table] = $columns;
}

function panel_event_category_id(string $eventType): int
{
    $eventType = trim($eventType) !== '' ? trim($eventType) : 'otro';
    $definitions = [
        'verbena' => ['Verbena', 'music', '#e11d48'],
        'desperta' => ['Desperta', 'bell', '#f97316'],
        'mascleta' => ['Mascleta', 'sparkles', '#ef4444'],
        'cena' => ['Cena', 'utensils', '#10b981'],
        'presentacion' => ['Presentacion', 'stage', '#8b5cf6'],
        'infantil' => ['Acto infantil', 'star', '#06b6d4'],
        'oficial' => ['Acto oficial', 'calendar', '#2563eb'],
        'otro' => ['Otros actos', 'map-pin', '#64748b'],
    ];
    [$name, $icon, $color] = $definitions[$eventType] ?? $definitions['otro'];

    $statement = db()->prepare('SELECT id FROM event_categories WHERE name = :name LIMIT 1');
    $statement->execute(['name' => $name]);
    $categoryId = (int) ($statement->fetchColumn() ?: 0);
    if ($categoryId > 0) {
        return $categoryId;
    }

    db()->prepare('INSERT INTO event_categories (name, icon, color) VALUES (:name, :icon, :color)')->execute([
        'name' => $name,
        'icon' => $icon,
        'color' => $color,
    ]);

    return (int) db()->lastInsertId();
}

function panel_register_approval(string $moduleKey, int $entityId, ?string $status): void
{
    if ($status !== 'pending') {
        return;
    }
    $module = panel_module($moduleKey);
    $row = panel_find($moduleKey, $entityId);
    $statement = db()->prepare('INSERT INTO approvals (entity_type, entity_id, commission_id, status, requested_by) VALUES (:entity_type, :entity_id, :commission_id, :status, :requested_by)');
    $statement->execute([
        'entity_type' => $module['table'],
        'entity_id' => $entityId,
        'commission_id' => (int) ($row['commission_id'] ?? panel_current_commission_id() ?? 0) ?: null,
        'status' => 'pending',
        'requested_by' => (int) (panel_user()['id'] ?? 0) ?: null,
    ]);
}

function panel_delete(string $moduleKey, int $id): void
{
    $module = panel_module($moduleKey);
    if (!panel_is_admin() && $moduleKey === 'commissions') {
        throw new RuntimeException('No puedes eliminar comisiones.');
    }
    $row = panel_find($moduleKey, $id);
    if (!$row) {
        throw new RuntimeException('Registro no encontrado.');
    }
    $statement = db()->prepare('DELETE FROM ' . $module['table'] . ' WHERE id = :id');
    $statement->execute(['id' => $id]);
    panel_log('deleted', $module['table'], $id);
}

function panel_approval_rows(): array
{
    $where = panel_is_admin() ? '' : 'WHERE approvals.commission_id = :commission_id';
    $statement = db()->prepare('SELECT approvals.*, commissions.name AS commission_name, users.name AS requested_by_name FROM approvals LEFT JOIN commissions ON commissions.id = approvals.commission_id LEFT JOIN users ON users.id = approvals.requested_by ' . $where . ' ORDER BY approvals.requested_at DESC LIMIT 200');
    $statement->execute(panel_is_admin() ? [] : ['commission_id' => panel_current_commission_id() ?? 0]);
    return $statement->fetchAll() ?: [];
}

function panel_review_approval(int $approvalId, string $decision, string $reason): void
{
    if (!panel_is_admin()) {
        throw new RuntimeException('Solo admin puede revisar.');
    }
    $approval = db()->prepare('SELECT * FROM approvals WHERE id = :id LIMIT 1');
    $approval->execute(['id' => $approvalId]);
    $row = $approval->fetch();
    if (!$row) {
        throw new RuntimeException('Solicitud no encontrada.');
    }
    $newStatus = $decision === 'approve' ? 'published' : 'rejected';
    db()->prepare('UPDATE approvals SET status = :status, rejection_reason = :reason, reviewed_by = :reviewed_by, reviewed_at = NOW() WHERE id = :id')->execute(['status' => $decision === 'approve' ? 'approved' : 'rejected', 'reason' => $reason, 'reviewed_by' => (int) panel_user()['id'], 'id' => $approvalId]);
    db()->prepare('UPDATE ' . $row['entity_type'] . ' SET status = :status, rejection_reason = :reason, reviewed_by = :reviewed_by WHERE id = :id')->execute(['status' => $newStatus, 'reason' => $reason, 'reviewed_by' => (int) panel_user()['id'], 'id' => (int) $row['entity_id']]);
}
