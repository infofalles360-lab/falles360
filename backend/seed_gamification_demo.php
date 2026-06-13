<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

function demo_falla_map(array $slugs): array
{
    $placeholders = implode(', ', array_fill(0, count($slugs), '?'));
    $statement = db()->prepare(
        "SELECT *
         FROM fallas
         WHERE slug IN ({$placeholders})"
    );
    $statement->execute($slugs);

    $map = [];
    foreach ($statement->fetchAll() ?: [] as $row) {
        $map[(string) $row['slug']] = $row;
    }

    return $map;
}

function demo_ensure_user(string $email, string $name): int
{
    $statement = db()->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $statement->execute(['email' => $email]);
    $existing = $statement->fetch();

    if ($existing) {
        return (int) $existing['id'];
    }

    $insert = db()->prepare(
        'INSERT INTO users (name, email, password, role, status)
         VALUES (:name, :email, :password, :role, :status)'
    );
    $insert->execute([
        'name' => $name,
        'email' => $email,
        'password' => password_hash('falles123', PASSWORD_DEFAULT),
        'role' => 'user',
        'status' => 'active',
    ]);

    return (int) db()->lastInsertId();
}

function demo_reset_user_state(int $userId): void
{
    $db = db();
    $db->prepare('DELETE FROM user_badges WHERE user_id = :user_id')->execute(['user_id' => $userId]);
    $db->prepare('DELETE FROM xp_events WHERE user_id = :user_id')->execute(['user_id' => $userId]);
    $db->prepare('DELETE FROM user_activity_log WHERE user_id = :user_id')->execute(['user_id' => $userId]);
    $db->prepare('DELETE FROM route_completions WHERE user_id = :user_id')->execute(['user_id' => $userId]);
    $db->prepare('DELETE FROM falla_visits WHERE user_id = :user_id')->execute(['user_id' => $userId]);
    $db->prepare('DELETE FROM gamification_profiles WHERE user_id = :user_id')->execute(['user_id' => $userId]);
    $db->prepare('DELETE FROM favorites WHERE user_id = :user_id')->execute(['user_id' => $userId]);
}

function demo_record_visit(int $userId, array $falla, string $occurredAt): void
{
    $visitDay = substr($occurredAt, 0, 10);

    if (gamification_has_visit_for_day($userId, (int) $falla['id'], $visitDay) !== null) {
        return;
    }

    $visit = gamification_insert_visit(
        $userId,
        (int) $falla['id'],
        (float) $falla['latitude'],
        (float) $falla['longitude'],
        8.0,
        gamification_default_visit_radius_meters(),
        'gps',
        $occurredAt,
        $visitDay
    );

    gamification_insert_activity(
        $userId,
        'falla_visit',
        'Falla visitada',
        (string) $falla['name'],
        'falla',
        (int) $falla['id'],
        ['seeded' => true],
        $occurredAt
    );
    gamification_insert_xp_event(
        $userId,
        'falla_visit',
        'Visita validada a ' . (string) $falla['name'],
        gamification_xp_value('falla_visit'),
        'falla_visit',
        (int) ($visit['id'] ?? 0),
        'falla_visit:' . $userId . ':' . $falla['id'] . ':' . $visitDay,
        ['seeded' => true],
        $occurredAt
    );

    if (gamification_is_prized_falla($falla)) {
        gamification_insert_xp_event(
            $userId,
            'prized_falla_visit',
            'Visita premiada: ' . (string) $falla['name'],
            gamification_xp_value('prized_falla_visit'),
            'falla_visit',
            (int) ($visit['id'] ?? 0),
            'prized_falla_visit:' . $userId . ':' . $falla['id'] . ':' . $visitDay,
            ['seeded' => true],
            $occurredAt
        );
    }

    if (gamification_is_infantile_falla($falla)) {
        gamification_insert_xp_event(
            $userId,
            'infantile_falla_visit',
            'Visita infantil: ' . (string) $falla['name'],
            gamification_xp_value('infantile_falla_visit'),
            'falla_visit',
            (int) ($visit['id'] ?? 0),
            'infantile_falla_visit:' . $userId . ':' . $falla['id'] . ':' . $visitDay,
            ['seeded' => true],
            $occurredAt
        );
    }
}

function demo_add_favorite(int $userId, array $falla, string $occurredAt): void
{
    $exists = gamification_fetch_row(
        'SELECT id
         FROM favorites
         WHERE user_id = :user_id
           AND falla_id = :falla_id
         LIMIT 1',
        [
            'user_id' => $userId,
            'falla_id' => (int) $falla['id'],
        ]
    );

    if ($exists === null) {
        $insert = db()->prepare(
            'INSERT INTO favorites (user_id, falla_id)
             VALUES (:user_id, :falla_id)'
        );
        $insert->execute([
            'user_id' => $userId,
            'falla_id' => (int) $falla['id'],
        ]);
    }

    gamification_insert_activity(
        $userId,
        'favorite_added',
        'Falla guardada',
        (string) $falla['name'],
        'falla',
        (int) $falla['id'],
        ['seeded' => true],
        $occurredAt
    );
    gamification_insert_xp_event(
        $userId,
        'favorite_added',
        'Favorito añadido',
        gamification_xp_value('favorite_added'),
        'falla',
        (int) $falla['id'],
        'favorite_added:' . $userId . ':' . $falla['id'],
        ['seeded' => true],
        $occurredAt
    );
}

function demo_add_navigation(int $userId, array $falla, string $occurredAt, string $mode = 'internal'): void
{
    gamification_insert_activity(
        $userId,
        'navigation_start',
        'Navegación iniciada',
        (string) $falla['name'],
        'falla',
        (int) $falla['id'],
        ['seeded' => true, 'mode' => $mode],
        $occurredAt
    );
}

function demo_add_content_read(int $userId, array $falla, string $occurredAt): void
{
    if (gamification_insert_xp_event(
        $userId,
        'content_view',
        'Ficha cultural completada',
        gamification_xp_value('content_view'),
        'falla',
        (int) $falla['id'],
        'content_view:' . $userId . ':' . $falla['id'],
        ['seeded' => true, 'section' => 'history'],
        $occurredAt
    )) {
        gamification_insert_activity(
            $userId,
            'content_read',
            'Ficha leída',
            (string) $falla['name'],
            'falla',
            (int) $falla['id'],
            ['seeded' => true, 'section' => 'history'],
            $occurredAt
        );
    }
}

try {
    gamification_bootstrap();

    $email = 'demo@falles360.local';
    $userId = demo_ensure_user($email, 'Demo Fallero');
    demo_reset_user_state($userId);

    $slugs = [
        'convent-de-jerusalem-matematic-marzal',
        'na-jordana',
        'placa-del-pilar',
        'sueca-literat-azorin',
        'a-regne-de-valencia-duc-de-calabria',
        'cuba-literat-azorin',
        'monestir-de-poblet-aparicio-albinana',
        'exposicio-misser-masco',
        'almirall-cadarso-comte-daltea',
    ];
    $fallas = demo_falla_map($slugs);

    $visitPlan = [
        ['slug' => 'convent-de-jerusalem-matematic-marzal', 'at' => '2026-03-15 10:05:00'],
        ['slug' => 'na-jordana', 'at' => '2026-03-15 11:15:00'],
        ['slug' => 'placa-del-pilar', 'at' => '2026-03-15 12:00:00'],
        ['slug' => 'sueca-literat-azorin', 'at' => '2026-03-15 18:20:00'],
        ['slug' => 'a-regne-de-valencia-duc-de-calabria', 'at' => '2026-03-15 19:05:00'],
        ['slug' => 'cuba-literat-azorin', 'at' => '2026-03-16 12:10:00'],
        ['slug' => 'monestir-de-poblet-aparicio-albinana', 'at' => '2026-03-16 18:45:00'],
        ['slug' => 'exposicio-misser-masco', 'at' => '2026-03-17 21:10:00'],
        ['slug' => 'almirall-cadarso-comte-daltea', 'at' => '2026-03-17 22:05:00'],
        ['slug' => 'cuba-literat-azorin', 'at' => '2026-03-17 23:20:00'],
    ];

    foreach ($visitPlan as $visit) {
        if (isset($fallas[$visit['slug']])) {
            demo_record_visit($userId, $fallas[$visit['slug']], $visit['at']);
        }
    }

    $favoritePlan = [
        'convent-de-jerusalem-matematic-marzal',
        'na-jordana',
        'placa-del-pilar',
        'sueca-literat-azorin',
        'a-regne-de-valencia-duc-de-calabria',
        'cuba-literat-azorin',
    ];
    foreach ($favoritePlan as $index => $slug) {
        if (isset($fallas[$slug])) {
            demo_add_favorite($userId, $fallas[$slug], sprintf('2026-03-1%d 09:0%d:00', ($index % 3) + 5, $index));
        }
    }

    $navigationPlan = [
        ['slug' => 'convent-de-jerusalem-matematic-marzal', 'at' => '2026-03-15 09:00:00'],
        ['slug' => 'na-jordana', 'at' => '2026-03-15 10:30:00'],
        ['slug' => 'placa-del-pilar', 'at' => '2026-03-16 11:00:00'],
        ['slug' => 'sueca-literat-azorin', 'at' => '2026-03-16 17:40:00'],
        ['slug' => 'cuba-literat-azorin', 'at' => '2026-03-17 20:40:00'],
    ];
    foreach ($navigationPlan as $navigation) {
        if (isset($fallas[$navigation['slug']])) {
            demo_add_navigation($userId, $fallas[$navigation['slug']], $navigation['at']);
        }
    }

    $contentPlan = [
        ['slug' => 'convent-de-jerusalem-matematic-marzal', 'at' => '2026-03-15 13:10:00'],
        ['slug' => 'na-jordana', 'at' => '2026-03-15 13:40:00'],
        ['slug' => 'placa-del-pilar', 'at' => '2026-03-16 12:40:00'],
        ['slug' => 'sueca-literat-azorin', 'at' => '2026-03-16 20:15:00'],
        ['slug' => 'monestir-de-poblet-aparicio-albinana', 'at' => '2026-03-17 18:00:00'],
    ];
    foreach ($contentPlan as $content) {
        if (isset($fallas[$content['slug']])) {
            demo_add_content_read($userId, $fallas[$content['slug']], $content['at']);
        }
    }

    $bundle = gamification_profile_bundle($userId);

    echo 'Demo gamificado preparado para el usuario #' . $userId . PHP_EOL;
    echo 'XP total: ' . ($bundle['profile']['xp_total'] ?? 0) . PHP_EOL;
    echo 'Nivel: ' . ($bundle['profile']['level']['name'] ?? 'Curioso') . PHP_EOL;
    echo 'Insignias desbloqueadas: ' . ($bundle['profile']['totals']['badges_unlocked'] ?? 0) . PHP_EOL;
    echo 'Rutas completadas: ' . ($bundle['profile']['totals']['routes_completed'] ?? 0) . PHP_EOL;
} catch (Throwable $exception) {
    fwrite(STDERR, "No se pudo sembrar la demo gamificada: " . $exception->getMessage() . PHP_EOL);
    exit(1);
}
