<?php
declare(strict_types=1);

function gamification_fetch_all(string $sql, array $params = []): array
{
    $statement = db()->prepare($sql);
    $statement->execute($params);

    return $statement->fetchAll() ?: [];
}

function gamification_fetch_row(string $sql, array $params = []): ?array
{
    $rows = gamification_fetch_all($sql, $params);

    return $rows[0] ?? null;
}

function gamification_fetch_value(string $sql, array $params = []): int
{
    $row = gamification_fetch_row($sql, $params);

    if ($row === null) {
        return 0;
    }

    return (int) array_values($row)[0];
}

function gamification_bootstrap(): void
{
    static $bootstrapped = false;

    if ($bootstrapped) {
        return;
    }

    gamification_ensure_schema();
    gamification_seed_catalog();

    $bootstrapped = true;
}

function gamification_ensure_schema(): void
{
    static $schemaReady = false;

    if ($schemaReady) {
        return;
    }

    $migrationFile = __DIR__ . '/../backend/migrations/20260407_create_gamification_module.sql';
    $sql = file_get_contents($migrationFile);

    if (!is_string($sql) || trim($sql) === '') {
        throw new RuntimeException('No se encontro la migracion principal de gamificacion.');
    }

    db()->exec($sql);
    $schemaReady = true;
}

function gamification_seed_catalog(): void
{
    static $seeded = false;

    if ($seeded) {
        return;
    }

    $db = db();

    $badgeUpsert = $db->prepare(
        'INSERT INTO badges (
            name,
            slug,
            description,
            category,
            rarity,
            icon_path,
            unlock_condition_text,
            rule_key,
            rule_config,
            is_active,
            sort_order
         ) VALUES (
            :name,
            :slug,
            :description,
            :category,
            :rarity,
            :icon_path,
            :unlock_condition_text,
            :rule_key,
            :rule_config,
            :is_active,
            :sort_order
         )
         ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            category = VALUES(category),
            rarity = VALUES(rarity),
            icon_path = VALUES(icon_path),
            unlock_condition_text = VALUES(unlock_condition_text),
            rule_key = VALUES(rule_key),
            rule_config = VALUES(rule_config),
            is_active = VALUES(is_active),
            sort_order = VALUES(sort_order)'
    );

    foreach (gamification_badge_definitions() as $definition) {
        $badgeUpsert->execute([
            'name' => $definition['name'],
            'slug' => $definition['slug'],
            'description' => $definition['description'],
            'category' => $definition['category'],
            'rarity' => $definition['rarity'],
            'icon_path' => $definition['icon_path'],
            'unlock_condition_text' => $definition['unlock_condition_text'],
            'rule_key' => $definition['rule_key'],
            'rule_config' => gamification_json_encode($definition['rule_config']),
            'is_active' => 1,
            'sort_order' => $definition['sort_order'],
        ]);
    }

    $routeUpsert = $db->prepare(
        'INSERT INTO gamification_routes (
            name,
            slug,
            description,
            category,
            min_completion_percentage,
            is_active,
            sort_order
         ) VALUES (
            :name,
            :slug,
            :description,
            :category,
            :min_completion_percentage,
            :is_active,
            :sort_order
         )
         ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            category = VALUES(category),
            min_completion_percentage = VALUES(min_completion_percentage),
            is_active = VALUES(is_active),
            sort_order = VALUES(sort_order)'
    );

    $zoneUpsert = $db->prepare(
        'INSERT INTO gamification_zones (
            name,
            slug,
            description,
            is_emblematic,
            is_active,
            sort_order
         ) VALUES (
            :name,
            :slug,
            :description,
            :is_emblematic,
            :is_active,
            :sort_order
         )
         ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            is_emblematic = VALUES(is_emblematic),
            is_active = VALUES(is_active),
            sort_order = VALUES(sort_order)'
    );

    $routeLinkDelete = $db->prepare('DELETE FROM gamification_route_fallas WHERE route_id = :route_id');
    $routeLinkInsert = $db->prepare(
        'INSERT IGNORE INTO gamification_route_fallas (route_id, falla_id, stop_order)
         VALUES (:route_id, :falla_id, :stop_order)'
    );
    $zoneLinkDelete = $db->prepare('DELETE FROM gamification_zone_fallas WHERE zone_id = :zone_id');
    $zoneLinkInsert = $db->prepare(
        'INSERT IGNORE INTO gamification_zone_fallas (zone_id, falla_id, stop_order)
         VALUES (:zone_id, :falla_id, :stop_order)'
    );

    $routeDefinitions = gamification_route_definitions();
    $zoneDefinitions = gamification_zone_definitions();
    $allFallaSlugs = [];

    foreach ($routeDefinitions as $definition) {
        $allFallaSlugs = array_merge($allFallaSlugs, $definition['falla_slugs']);
    }

    foreach ($zoneDefinitions as $definition) {
        $allFallaSlugs = array_merge($allFallaSlugs, $definition['falla_slugs']);
    }

    $fallaIdsBySlug = gamification_fetch_falla_ids_by_slugs(array_values(array_unique($allFallaSlugs)));

    foreach ($routeDefinitions as $definition) {
        $routeUpsert->execute([
            'name' => $definition['name'],
            'slug' => $definition['slug'],
            'description' => $definition['description'],
            'category' => $definition['category'],
            'min_completion_percentage' => $definition['min_completion_percentage'],
            'is_active' => 1,
            'sort_order' => $definition['sort_order'],
        ]);

        $route = gamification_fetch_row(
            'SELECT id
             FROM gamification_routes
             WHERE slug = :slug
             LIMIT 1',
            ['slug' => $definition['slug']]
        );

        if ($route === null) {
            continue;
        }

        $routeId = (int) $route['id'];
        $routeLinkDelete->execute(['route_id' => $routeId]);

        foreach ($definition['falla_slugs'] as $index => $fallaSlug) {
            if (!isset($fallaIdsBySlug[$fallaSlug])) {
                continue;
            }

            $routeLinkInsert->execute([
                'route_id' => $routeId,
                'falla_id' => $fallaIdsBySlug[$fallaSlug],
                'stop_order' => $index + 1,
            ]);
        }
    }

    foreach ($zoneDefinitions as $definition) {
        $zoneUpsert->execute([
            'name' => $definition['name'],
            'slug' => $definition['slug'],
            'description' => $definition['description'],
            'is_emblematic' => $definition['is_emblematic'] ? 1 : 0,
            'is_active' => 1,
            'sort_order' => $definition['sort_order'],
        ]);

        $zone = gamification_fetch_row(
            'SELECT id
             FROM gamification_zones
             WHERE slug = :slug
             LIMIT 1',
            ['slug' => $definition['slug']]
        );

        if ($zone === null) {
            continue;
        }

        $zoneId = (int) $zone['id'];
        $zoneLinkDelete->execute(['zone_id' => $zoneId]);

        foreach ($definition['falla_slugs'] as $index => $fallaSlug) {
            if (!isset($fallaIdsBySlug[$fallaSlug])) {
                continue;
            }

            $zoneLinkInsert->execute([
                'zone_id' => $zoneId,
                'falla_id' => $fallaIdsBySlug[$fallaSlug],
                'stop_order' => $index + 1,
            ]);
        }
    }

    $seeded = true;
}

function gamification_fetch_falla_ids_by_slugs(array $slugs): array
{
    $slugs = array_values(array_unique(array_filter(array_map('strval', $slugs))));

    if ($slugs === []) {
        return [];
    }

    $placeholders = implode(', ', array_fill(0, count($slugs), '?'));
    $statement = db()->prepare(
        "SELECT id, slug
         FROM fallas
         WHERE slug IN ({$placeholders})"
    );
    $statement->execute($slugs);

    $map = [];

    foreach ($statement->fetchAll() ?: [] as $row) {
        $map[(string) $row['slug']] = (int) $row['id'];
    }

    return $map;
}

function gamification_ensure_profile_exists(int $userId): void
{
    $level = gamification_level_for_xp(0);
    $statement = db()->prepare(
        'INSERT INTO gamification_profiles (
            user_id,
            xp_total,
            level_number,
            level_name,
            level_progress_percent,
            current_level_xp,
            next_level_xp
         ) VALUES (
            :user_id,
            0,
            :level_number,
            :level_name,
            :level_progress_percent,
            :current_level_xp,
            :next_level_xp
         )
         ON DUPLICATE KEY UPDATE user_id = user_id'
    );
    $statement->execute([
        'user_id' => $userId,
        'level_number' => $level['number'],
        'level_name' => $level['name'],
        'level_progress_percent' => $level['progress_percent'],
        'current_level_xp' => $level['min_xp'],
        'next_level_xp' => $level['next_xp'],
    ]);
}

function gamification_fetch_profile_row(int $userId): array
{
    gamification_ensure_profile_exists($userId);

    return gamification_fetch_row(
        'SELECT *
         FROM gamification_profiles
         WHERE user_id = :user_id
         LIMIT 1',
        ['user_id' => $userId]
    ) ?? [];
}

function gamification_update_profile_row(int $userId, array $summary): void
{
    gamification_ensure_profile_exists($userId);

    $statement = db()->prepare(
        'UPDATE gamification_profiles
         SET xp_total = :xp_total,
             level_number = :level_number,
             level_name = :level_name,
             level_progress_percent = :level_progress_percent,
             current_level_xp = :current_level_xp,
             next_level_xp = :next_level_xp,
             distinct_fallas_visited = :distinct_fallas_visited,
             total_visit_events = :total_visit_events,
             routes_completed = :routes_completed,
             routes_started = :routes_started,
             neighborhoods_explored = :neighborhoods_explored,
             neighborhoods_completed = :neighborhoods_completed,
             badges_unlocked = :badges_unlocked,
             favorite_fallas_count = :favorite_fallas_count,
             content_reads_count = :content_reads_count,
             navigation_uses_count = :navigation_uses_count,
             total_progress_percent = :total_progress_percent,
             fallas_completion_percent = :fallas_completion_percent,
             last_activity_at = :last_activity_at
         WHERE user_id = :user_id'
    );
    $statement->execute([
        'user_id' => $userId,
        'xp_total' => $summary['xp_total'],
        'level_number' => $summary['level_number'],
        'level_name' => $summary['level_name'],
        'level_progress_percent' => $summary['level_progress_percent'],
        'current_level_xp' => $summary['current_level_xp'],
        'next_level_xp' => $summary['next_level_xp'],
        'distinct_fallas_visited' => $summary['distinct_fallas_visited'],
        'total_visit_events' => $summary['total_visit_events'],
        'routes_completed' => $summary['routes_completed'],
        'routes_started' => $summary['routes_started'],
        'neighborhoods_explored' => $summary['neighborhoods_explored'],
        'neighborhoods_completed' => $summary['neighborhoods_completed'],
        'badges_unlocked' => $summary['badges_unlocked'],
        'favorite_fallas_count' => $summary['favorite_fallas_count'],
        'content_reads_count' => $summary['content_reads_count'],
        'navigation_uses_count' => $summary['navigation_uses_count'],
        'total_progress_percent' => $summary['total_progress_percent'],
        'fallas_completion_percent' => $summary['fallas_completion_percent'],
        'last_activity_at' => $summary['last_activity_at'],
    ]);
}

function gamification_fetch_badge_rows(?int $userId = null): array
{
    if ($userId === null) {
        return gamification_fetch_all(
            'SELECT *
             FROM badges
             WHERE is_active = 1
             ORDER BY sort_order ASC, id ASC'
        );
    }

    return gamification_fetch_all(
        'SELECT badges.*,
                user_badges.unlocked_at,
                CASE WHEN user_badges.id IS NULL THEN 0 ELSE 1 END AS is_unlocked
         FROM badges
         LEFT JOIN user_badges
           ON user_badges.badge_id = badges.id
          AND user_badges.user_id = :user_id
         WHERE badges.is_active = 1
         ORDER BY badges.sort_order ASC, badges.id ASC',
        ['user_id' => $userId]
    );
}

function gamification_fetch_user_badge_rows(int $userId): array
{
    return gamification_fetch_all(
        'SELECT badges.*, user_badges.unlocked_at, 1 AS is_unlocked
         FROM user_badges
         INNER JOIN badges ON badges.id = user_badges.badge_id
         WHERE user_badges.user_id = :user_id
         ORDER BY user_badges.unlocked_at DESC, badges.sort_order ASC',
        ['user_id' => $userId]
    );
}

function gamification_insert_user_badge(int $userId, int $badgeId, string $unlockedAt): bool
{
    $statement = db()->prepare(
        'INSERT INTO user_badges (user_id, badge_id, unlocked_at)
         VALUES (:user_id, :badge_id, :unlocked_at)'
    );

    try {
        $statement->execute([
            'user_id' => $userId,
            'badge_id' => $badgeId,
            'unlocked_at' => $unlockedAt,
        ]);

        return true;
    } catch (PDOException $exception) {
        if ($exception->getCode() === '23000') {
            return false;
        }

        throw $exception;
    }
}

function gamification_find_falla(int $fallaId): ?array
{
    return gamification_fetch_row(
        'SELECT *
         FROM fallas
         WHERE id = :id
         LIMIT 1',
        ['id' => $fallaId]
    );
}

function gamification_has_visit_for_day(int $userId, int $fallaId, string $visitDay): ?array
{
    return gamification_fetch_row(
        'SELECT *
         FROM falla_visits
         WHERE user_id = :user_id
           AND falla_id = :falla_id
           AND visit_day = :visit_day
         LIMIT 1',
        [
            'user_id' => $userId,
            'falla_id' => $fallaId,
            'visit_day' => $visitDay,
        ]
    );
}

function gamification_insert_visit(
    int $userId,
    int $fallaId,
    float $latitude,
    float $longitude,
    float $distanceMeters,
    int $radiusMeters,
    string $visitSource,
    string $visitedAt,
    string $visitDay
): array {
    $statement = db()->prepare(
        'INSERT INTO falla_visits (
            user_id,
            falla_id,
            visit_source,
            verified_radius_meters,
            distance_meters,
            latitude,
            longitude,
            visit_day,
            visited_at
         ) VALUES (
            :user_id,
            :falla_id,
            :visit_source,
            :verified_radius_meters,
            :distance_meters,
            :latitude,
            :longitude,
            :visit_day,
            :visited_at
         )'
    );
    $statement->execute([
        'user_id' => $userId,
        'falla_id' => $fallaId,
        'visit_source' => $visitSource,
        'verified_radius_meters' => $radiusMeters,
        'distance_meters' => $distanceMeters,
        'latitude' => $latitude,
        'longitude' => $longitude,
        'visit_day' => $visitDay,
        'visited_at' => $visitedAt,
    ]);

    $visitId = (int) db()->lastInsertId();

    return gamification_fetch_row(
        'SELECT *
         FROM falla_visits
         WHERE id = :id
         LIMIT 1',
        ['id' => $visitId]
    ) ?? [];
}

function gamification_insert_activity(
    int $userId,
    string $eventType,
    string $title,
    string $body,
    ?string $relatedEntityType = null,
    ?int $relatedEntityId = null,
    array $meta = [],
    ?string $occurredAt = null
): void {
    $statement = db()->prepare(
        'INSERT INTO user_activity_log (
            user_id,
            event_type,
            title,
            body,
            related_entity_type,
            related_entity_id,
            meta_json,
            occurred_at
         ) VALUES (
            :user_id,
            :event_type,
            :title,
            :body,
            :related_entity_type,
            :related_entity_id,
            :meta_json,
            :occurred_at
         )'
    );
    $statement->execute([
        'user_id' => $userId,
        'event_type' => $eventType,
        'title' => $title,
        'body' => $body,
        'related_entity_type' => $relatedEntityType,
        'related_entity_id' => $relatedEntityId,
        'meta_json' => gamification_json_encode($meta),
        'occurred_at' => $occurredAt ?? (new DateTimeImmutable('now', gamification_timezone()))->format('Y-m-d H:i:s'),
    ]);
}

function gamification_fetch_recent_activity_rows(int $userId, int $limit = 12): array
{
    return gamification_fetch_all(
        'SELECT *
         FROM user_activity_log
         WHERE user_id = :user_id
         ORDER BY occurred_at DESC, id DESC
         LIMIT ' . (int) $limit,
        ['user_id' => $userId]
    );
}

function gamification_insert_xp_event(
    int $userId,
    string $eventType,
    string $description,
    int $amount,
    ?string $sourceType = null,
    ?int $sourceId = null,
    ?string $uniqueKey = null,
    array $meta = [],
    ?string $occurredAt = null
): bool {
    $statement = db()->prepare(
        'INSERT INTO xp_events (
            user_id,
            event_type,
            description,
            amount,
            source_type,
            source_id,
            unique_key,
            meta_json,
            occurred_at
         ) VALUES (
            :user_id,
            :event_type,
            :description,
            :amount,
            :source_type,
            :source_id,
            :unique_key,
            :meta_json,
            :occurred_at
         )'
    );

    try {
        $statement->execute([
            'user_id' => $userId,
            'event_type' => $eventType,
            'description' => $description,
            'amount' => $amount,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'unique_key' => $uniqueKey,
            'meta_json' => gamification_json_encode($meta),
            'occurred_at' => $occurredAt ?? (new DateTimeImmutable('now', gamification_timezone()))->format('Y-m-d H:i:s'),
        ]);

        return true;
    } catch (PDOException $exception) {
        if ($exception->getCode() === '23000') {
            return false;
        }

        throw $exception;
    }
}

function gamification_sum_xp_total(int $userId): int
{
    return gamification_fetch_value(
        'SELECT COALESCE(SUM(amount), 0)
         FROM xp_events
         WHERE user_id = :user_id',
        ['user_id' => $userId]
    );
}

function gamification_fetch_xp_breakdown_rows(int $userId): array
{
    return gamification_fetch_all(
        'SELECT event_type, SUM(amount) AS xp_total, COUNT(*) AS events_total
         FROM xp_events
         WHERE user_id = :user_id
         GROUP BY event_type
         ORDER BY xp_total DESC, event_type ASC',
        ['user_id' => $userId]
    );
}

function gamification_fetch_route_status_rows(int $userId): array
{
    return gamification_fetch_all(
        'SELECT gamification_routes.*,
                COUNT(DISTINCT gamification_route_fallas.falla_id) AS total_fallas,
                COUNT(DISTINCT falla_visits.falla_id) AS visited_fallas,
                COALESCE(route_completions.progress_percent, 0) AS progress_percent,
                COALESCE(route_completions.is_completed, 0) AS is_completed,
                route_completions.completed_at,
                route_completions.last_evaluated_at
         FROM gamification_routes
         LEFT JOIN gamification_route_fallas
           ON gamification_route_fallas.route_id = gamification_routes.id
         LEFT JOIN falla_visits
           ON falla_visits.falla_id = gamification_route_fallas.falla_id
          AND falla_visits.user_id = :visits_user_id
         LEFT JOIN route_completions
           ON route_completions.route_id = gamification_routes.id
          AND route_completions.user_id = :completions_user_id
         WHERE gamification_routes.is_active = 1
         GROUP BY gamification_routes.id, route_completions.progress_percent, route_completions.is_completed, route_completions.completed_at, route_completions.last_evaluated_at
         ORDER BY gamification_routes.sort_order ASC, gamification_routes.id ASC',
        [
            'visits_user_id' => $userId,
            'completions_user_id' => $userId,
        ]
    );
}

function gamification_upsert_route_completion(
    int $userId,
    int $routeId,
    int $visitedFallasCount,
    int $totalFallasCount,
    float $progressPercent,
    bool $isCompleted,
    string $evaluatedAt,
    ?string $completedAt
): void {
    $statement = db()->prepare(
        'INSERT INTO route_completions (
            user_id,
            route_id,
            visited_fallas_count,
            total_fallas_count,
            progress_percent,
            is_completed,
            last_evaluated_at,
            completed_at
         ) VALUES (
            :user_id,
            :route_id,
            :visited_fallas_count,
            :total_fallas_count,
            :progress_percent,
            :is_completed,
            :last_evaluated_at,
            :completed_at
         )
         ON DUPLICATE KEY UPDATE
            visited_fallas_count = VALUES(visited_fallas_count),
            total_fallas_count = VALUES(total_fallas_count),
            progress_percent = VALUES(progress_percent),
            is_completed = VALUES(is_completed),
            last_evaluated_at = VALUES(last_evaluated_at),
            completed_at = CASE
                WHEN route_completions.completed_at IS NOT NULL THEN route_completions.completed_at
                ELSE VALUES(completed_at)
            END'
    );
    $statement->execute([
        'user_id' => $userId,
        'route_id' => $routeId,
        'visited_fallas_count' => $visitedFallasCount,
        'total_fallas_count' => $totalFallasCount,
        'progress_percent' => $progressPercent,
        'is_completed' => $isCompleted ? 1 : 0,
        'last_evaluated_at' => $evaluatedAt,
        'completed_at' => $completedAt,
    ]);
}

function gamification_fetch_zone_status_rows(int $userId): array
{
    return gamification_fetch_all(
        'SELECT gamification_zones.*,
                COUNT(DISTINCT gamification_zone_fallas.falla_id) AS total_fallas,
                COUNT(DISTINCT falla_visits.falla_id) AS visited_fallas
         FROM gamification_zones
         LEFT JOIN gamification_zone_fallas
           ON gamification_zone_fallas.zone_id = gamification_zones.id
         LEFT JOIN falla_visits
           ON falla_visits.falla_id = gamification_zone_fallas.falla_id
          AND falla_visits.user_id = :user_id
         WHERE gamification_zones.is_active = 1
         GROUP BY gamification_zones.id
         ORDER BY gamification_zones.sort_order ASC, gamification_zones.id ASC',
        ['user_id' => $userId]
    );
}

function gamification_count_active_badges(): int
{
    return gamification_fetch_value(
        'SELECT COUNT(*)
         FROM badges
         WHERE is_active = 1'
    );
}

function gamification_count_active_routes(): int
{
    return gamification_fetch_value(
        'SELECT COUNT(*)
         FROM gamification_routes
         WHERE is_active = 1'
    );
}

function gamification_count_known_neighborhoods(): int
{
    return gamification_fetch_value(
        "SELECT COUNT(DISTINCT neighborhood)
         FROM fallas
         WHERE status = 'active'
           AND COALESCE(NULLIF(TRIM(neighborhood), ''), '') <> ''"
    );
}

function gamification_total_active_fallas(): int
{
    return gamification_fetch_value(
        "SELECT COUNT(*)
         FROM fallas
         WHERE status = 'active'"
    );
}

function gamification_count_distinct_favorite_fallas(int $userId): int
{
    return gamification_fetch_value(
        'SELECT COUNT(DISTINCT falla_id)
         FROM favorites
         WHERE user_id = :user_id
           AND falla_id IS NOT NULL',
        ['user_id' => $userId]
    );
}

function gamification_fetch_visited_falla_ids(int $userId): array
{
    $rows = gamification_fetch_all(
        'SELECT DISTINCT falla_id
         FROM falla_visits
         WHERE user_id = :user_id
         ORDER BY falla_id ASC',
        ['user_id' => $userId]
    );

    return array_values(array_map(static fn (array $row): int => (int) $row['falla_id'], $rows));
}

function gamification_fetch_neighborhood_progress_rows(int $userId): array
{
    return gamification_fetch_all(
        "SELECT totals.neighborhood,
                totals.total_fallas,
                COALESCE(visits.visited_fallas, 0) AS visited_fallas,
                COALESCE(visits.last_visit_at, NULL) AS last_visit_at
         FROM (
            SELECT neighborhood, COUNT(*) AS total_fallas
            FROM fallas
            WHERE status = 'active'
              AND COALESCE(NULLIF(TRIM(neighborhood), ''), '') <> ''
            GROUP BY neighborhood
         ) AS totals
         LEFT JOIN (
            SELECT fallas.neighborhood,
                   COUNT(DISTINCT falla_visits.falla_id) AS visited_fallas,
                   MAX(falla_visits.visited_at) AS last_visit_at
            FROM falla_visits
            INNER JOIN fallas ON fallas.id = falla_visits.falla_id
            WHERE falla_visits.user_id = :user_id
              AND COALESCE(NULLIF(TRIM(fallas.neighborhood), ''), '') <> ''
            GROUP BY fallas.neighborhood
         ) AS visits
           ON visits.neighborhood = totals.neighborhood
         ORDER BY visited_fallas DESC, totals.total_fallas DESC, totals.neighborhood ASC",
        ['user_id' => $userId]
    );
}

function gamification_fetch_badge_by_slug(string $slug): ?array
{
    return gamification_fetch_row(
        'SELECT *
         FROM badges
         WHERE slug = :slug
         LIMIT 1',
        ['slug' => $slug]
    );
}
