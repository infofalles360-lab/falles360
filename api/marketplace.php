<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../panel/repository.php';

function marketplace_active_rows(string $table, string $orderBy = 'updated_at DESC, id DESC'): array
{
    panel_ensure_marketplace_tables();
    $statement = db()->prepare('SELECT * FROM ' . $table . " WHERE status = 'active' ORDER BY {$orderBy} LIMIT 200");
    $statement->execute();
    return $statement->fetchAll() ?: [];
}

function marketplace_text(mixed $value, int $maxLength = 500): string
{
    return mb_substr(trim((string) ($value ?? '')), 0, $maxLength);
}

function marketplace_rows_payload(array $payload, string $key): array
{
    $rows = $payload[$key] ?? [];
    return is_array($rows) ? array_slice($rows, 0, 200) : [];
}

function marketplace_replace_table(string $table, array $rows, array $columns, callable $normalizer): void
{
    db()->exec('DELETE FROM ' . $table);
    if ($rows === []) {
        return;
    }

    $columnSql = implode(', ', $columns);
    $placeholderSql = implode(', ', array_map(static fn (string $column): string => ':' . $column, $columns));
    $statement = db()->prepare("INSERT INTO {$table} ({$columnSql}) VALUES ({$placeholderSql})");

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $values = $normalizer($row);
        if ($values === null) {
            continue;
        }

        $statement->execute($values);
    }
}

try {
    app_require_method(['GET', 'POST']);

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
        api_admin_user_or_error();
        csrf_assert_valid();
        app_require_json_content_type();
        $payload = app_request_json_payload(262144);

        panel_ensure_marketplace_tables();
        db()->beginTransaction();

        try {
            $settings = $payload['settings'] ?? [];
            if (is_array($settings)) {
                $settingsStatement = db()->prepare(
                    "INSERT INTO marketplace_settings (setting_key, setting_value, status)
                     VALUES (:setting_key, :setting_value, 'active')
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), status = 'active'"
                );
                foreach (['eyebrow', 'location_label', 'hero_title', 'hero_subtitle', 'featured_badge', 'quick_access_label'] as $key) {
                    $settingsStatement->execute([
                        'setting_key' => $key,
                        'setting_value' => marketplace_text($settings[$key] ?? '', 1200),
                    ]);
                }
            }

            marketplace_replace_table(
                'marketplace_filters',
                marketplace_rows_payload($payload, 'filters'),
                ['label', 'category', 'section_id', 'sort_order', 'status'],
                static function (array $row): ?array {
                    $label = marketplace_text($row['label'] ?? '', 90);
                    $category = marketplace_text($row['category'] ?? $label, 90);
                    if ($label === '' || $category === '') {
                        return null;
                    }
                    return [
                        'label' => $label,
                        'category' => $category,
                        'section_id' => marketplace_text($row['sectionId'] ?? $row['section_id'] ?? '', 120),
                        'sort_order' => (int) ($row['sortOrder'] ?? $row['sort_order'] ?? 100),
                        'status' => 'active',
                    ];
                }
            );

            marketplace_replace_table(
                'marketplace_businesses',
                marketplace_rows_payload($payload, 'businesses'),
                ['name', 'type', 'location', 'distance', 'promotion', 'action_label', 'badge', 'category', 'image_url', 'plan', 'phone', 'email', 'whatsapp', 'website', 'status'],
                static function (array $row): ?array {
                    $name = marketplace_text($row['name'] ?? '', 190);
                    if ($name === '') {
                        return null;
                    }
                    return [
                        'name' => $name,
                        'type' => marketplace_text($row['type'] ?? '', 90),
                        'location' => marketplace_text($row['location'] ?? '', 120),
                        'distance' => marketplace_text($row['distance'] ?? '', 60),
                        'promotion' => marketplace_text($row['promotion'] ?? '', 1200),
                        'action_label' => marketplace_text($row['actionLabel'] ?? $row['action_label'] ?? 'Ver oferta', 80),
                        'badge' => marketplace_text($row['badge'] ?? 'Destacado', 40),
                        'category' => marketplace_text($row['category'] ?? 'Restaurantes', 80),
                        'image_url' => marketplace_text($row['imageUrl'] ?? $row['image_url'] ?? '', 1200),
                        'plan' => marketplace_text($row['plan'] ?? 'Basico', 80),
                        'phone' => marketplace_text($row['phone'] ?? '', 80),
                        'email' => marketplace_text($row['email'] ?? '', 190),
                        'whatsapp' => marketplace_text($row['whatsapp'] ?? '', 80),
                        'website' => marketplace_text($row['website'] ?? '', 255),
                        'status' => 'active',
                    ];
                }
            );

            marketplace_replace_table(
                'marketplace_coupons',
                marketplace_rows_payload($payload, 'coupons'),
                ['title', 'business', 'condition_text', 'valid_until', 'action_label', 'status'],
                static function (array $row): ?array {
                    $title = marketplace_text($row['title'] ?? '', 190);
                    $business = marketplace_text($row['business'] ?? '', 190);
                    if ($title === '' || $business === '') {
                        return null;
                    }
                    return [
                        'title' => $title,
                        'business' => $business,
                        'condition_text' => marketplace_text($row['condition'] ?? $row['condition_text'] ?? '', 1200),
                        'valid_until' => marketplace_text($row['validUntil'] ?? $row['valid_until'] ?? '', 120),
                        'action_label' => marketplace_text($row['actionLabel'] ?? $row['action_label'] ?? 'Usar cupon', 80),
                        'status' => 'active',
                    ];
                }
            );

            marketplace_replace_table(
                'marketplace_products',
                marketplace_rows_payload($payload, 'products'),
                ['name', 'price', 'category', 'image_url', 'status'],
                static function (array $row): ?array {
                    $name = marketplace_text($row['name'] ?? '', 190);
                    if ($name === '') {
                        return null;
                    }
                    return [
                        'name' => $name,
                        'price' => marketplace_text($row['price'] ?? '', 80),
                        'category' => marketplace_text($row['category'] ?? '', 100),
                        'image_url' => marketplace_text($row['imageUrl'] ?? $row['image_url'] ?? '', 1200),
                        'status' => 'active',
                    ];
                }
            );

            marketplace_replace_table(
                'marketplace_experiences',
                marketplace_rows_payload($payload, 'experiences'),
                ['name', 'description', 'price', 'action_label', 'location', 'duration', 'capacity', 'business_name', 'image_url', 'contact_channel', 'status'],
                static function (array $row): ?array {
                    $name = marketplace_text($row['name'] ?? '', 190);
                    if ($name === '') {
                        return null;
                    }
                    return [
                        'name' => $name,
                        'description' => marketplace_text($row['description'] ?? '', 1200),
                        'price' => marketplace_text($row['price'] ?? '', 80),
                        'action_label' => marketplace_text($row['actionLabel'] ?? $row['action_label'] ?? 'Reservar', 80),
                        'location' => marketplace_text($row['location'] ?? '', 120),
                        'duration' => marketplace_text($row['duration'] ?? '', 80),
                        'capacity' => marketplace_text($row['capacity'] ?? '', 80),
                        'business_name' => marketplace_text($row['businessName'] ?? $row['business_name'] ?? '', 190),
                        'image_url' => marketplace_text($row['imageUrl'] ?? $row['image_url'] ?? '', 1200),
                        'contact_channel' => marketplace_text($row['contactChannel'] ?? $row['contact_channel'] ?? '', 120),
                        'status' => 'active',
                    ];
                }
            );

            db()->commit();
        } catch (Throwable $exception) {
            if (db()->inTransaction()) {
                db()->rollBack();
            }
            throw $exception;
        }

        app_json_response(['ok' => true]);
    }

    api_registered_user_or_error('Necesitas una cuenta registrada para acceder al marketplace.');

    app_json_response([
        'ok' => true,
        'managed' => true,
        'settings' => array_reduce(marketplace_active_rows('marketplace_settings'), static function (array $carry, array $row): array {
            $carry[(string) $row['setting_key']] = (string) ($row['setting_value'] ?? '');
            return $carry;
        }, []),
        'filters' => array_map(static fn (array $row): array => [
            'id' => 'filter-' . (int) $row['id'],
            'label' => (string) $row['label'],
            'category' => (string) $row['category'],
            'sectionId' => (string) ($row['section_id'] ?? ''),
            'sortOrder' => (int) ($row['sort_order'] ?? 100),
        ], marketplace_active_rows('marketplace_filters', 'sort_order ASC, id ASC')),
        'businesses' => array_map(static fn (array $row): array => [
            'id' => 'business-' . (int) $row['id'],
            'name' => (string) $row['name'],
            'type' => (string) ($row['type'] ?? ''),
            'location' => (string) ($row['location'] ?? ''),
            'distance' => (string) ($row['distance'] ?? ''),
            'promotion' => (string) ($row['promotion'] ?? ''),
            'actionLabel' => (string) ($row['action_label'] ?? 'Ver oferta'),
            'badge' => (string) ($row['badge'] ?? 'Destacado'),
            'category' => (string) ($row['category'] ?? 'Restaurantes'),
            'imageUrl' => (string) ($row['image_url'] ?? ''),
            'plan' => (string) ($row['plan'] ?? 'Basico'),
            'phone' => (string) ($row['phone'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'whatsapp' => (string) ($row['whatsapp'] ?? ''),
            'website' => (string) ($row['website'] ?? ''),
        ], marketplace_active_rows('marketplace_businesses')),
        'coupons' => array_map(static fn (array $row): array => [
            'id' => 'coupon-' . (int) $row['id'],
            'title' => (string) $row['title'],
            'business' => (string) $row['business'],
            'condition' => (string) ($row['condition_text'] ?? ''),
            'validUntil' => (string) ($row['valid_until'] ?? ''),
            'actionLabel' => (string) ($row['action_label'] ?? 'Usar cupon'),
        ], marketplace_active_rows('marketplace_coupons')),
        'products' => array_map(static fn (array $row): array => [
            'id' => 'product-' . (int) $row['id'],
            'name' => (string) $row['name'],
            'price' => (string) ($row['price'] ?? ''),
            'category' => (string) ($row['category'] ?? ''),
            'imageUrl' => (string) ($row['image_url'] ?? ''),
        ], marketplace_active_rows('marketplace_products')),
        'experiences' => array_map(static fn (array $row): array => [
            'id' => 'experience-' . (int) $row['id'],
            'name' => (string) $row['name'],
            'description' => (string) ($row['description'] ?? ''),
            'price' => (string) ($row['price'] ?? ''),
            'actionLabel' => (string) ($row['action_label'] ?? 'Reservar'),
            'location' => (string) ($row['location'] ?? ''),
            'duration' => (string) ($row['duration'] ?? ''),
            'capacity' => (string) ($row['capacity'] ?? ''),
            'businessName' => (string) ($row['business_name'] ?? ''),
            'imageUrl' => (string) ($row['image_url'] ?? ''),
            'contactChannel' => (string) ($row['contact_channel'] ?? ''),
        ], marketplace_active_rows('marketplace_experiences')),
    ]);
} catch (Throwable) {
    app_json_error('No se pudo cargar el marketplace.', 500);
}
