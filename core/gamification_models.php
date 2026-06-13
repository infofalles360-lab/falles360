<?php
declare(strict_types=1);

function gamification_json_encode(array $payload): string
{
    return json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
}

function gamification_json_decode(?string $payload): array
{
    if ($payload === null || trim($payload) === '') {
        return [];
    }

    $decoded = json_decode($payload, true);

    return is_array($decoded) ? $decoded : [];
}

function gamification_asset_url(?string $relativePath): ?string
{
    $normalized = trim((string) $relativePath);

    if ($normalized === '') {
        return null;
    }

    $segments = array_map(
        static fn (string $segment): string => rawurlencode($segment),
        array_values(array_filter(explode('/', ltrim($normalized, '/')), static fn (string $segment): bool => $segment !== ''))
    );

    return app_base_url() . '/' . implode('/', $segments);
}

function gamification_badge_model(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'name' => (string) ($row['name'] ?? ''),
        'slug' => (string) ($row['slug'] ?? ''),
        'description' => (string) ($row['description'] ?? ''),
        'category' => (string) ($row['category'] ?? ''),
        'rarity' => (string) ($row['rarity'] ?? 'common'),
        'icon_url' => gamification_asset_url((string) ($row['icon_path'] ?? '')),
        'unlock_condition_text' => (string) ($row['unlock_condition_text'] ?? ''),
        'is_active' => (bool) ($row['is_active'] ?? true),
        'is_unlocked' => (bool) ($row['is_unlocked'] ?? false),
        'unlocked_at' => $row['unlocked_at'] ?? null,
        'sort_order' => (int) ($row['sort_order'] ?? 0),
    ];
}

function gamification_route_model(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'name' => (string) ($row['name'] ?? ''),
        'slug' => (string) ($row['slug'] ?? ''),
        'description' => (string) ($row['description'] ?? ''),
        'category' => (string) ($row['category'] ?? 'recorrido'),
        'min_completion_percentage' => (float) ($row['min_completion_percentage'] ?? 100),
        'total_fallas' => (int) ($row['total_fallas'] ?? 0),
        'visited_fallas' => (int) ($row['visited_fallas'] ?? 0),
        'progress_percent' => round((float) ($row['progress_percent'] ?? 0), 2),
        'is_completed' => (bool) ($row['is_completed'] ?? false),
        'completed_at' => $row['completed_at'] ?? null,
        'last_evaluated_at' => $row['last_evaluated_at'] ?? null,
    ];
}

function gamification_zone_model(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'name' => (string) ($row['name'] ?? ''),
        'slug' => (string) ($row['slug'] ?? ''),
        'description' => (string) ($row['description'] ?? ''),
        'is_emblematic' => (bool) ($row['is_emblematic'] ?? false),
        'total_fallas' => (int) ($row['total_fallas'] ?? 0),
        'visited_fallas' => (int) ($row['visited_fallas'] ?? 0),
        'progress_percent' => round((float) ($row['progress_percent'] ?? 0), 2),
        'is_completed' => (bool) ($row['is_completed'] ?? false),
    ];
}

function gamification_activity_model(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'event_type' => (string) ($row['event_type'] ?? ''),
        'title' => (string) ($row['title'] ?? ''),
        'body' => (string) ($row['body'] ?? ''),
        'related_entity_type' => $row['related_entity_type'] ?? null,
        'related_entity_id' => isset($row['related_entity_id']) ? (int) $row['related_entity_id'] : null,
        'occurred_at' => $row['occurred_at'] ?? null,
        'meta' => gamification_json_decode($row['meta_json'] ?? null),
    ];
}

function gamification_profile_model(array $profile): array
{
    return [
        'xp_total' => (int) ($profile['xp_total'] ?? 0),
        'level' => [
            'number' => (int) ($profile['level_number'] ?? 1),
            'name' => (string) ($profile['level_name'] ?? 'Curioso'),
            'progress_percent' => round((float) ($profile['level_progress_percent'] ?? 0), 2),
            'current_level_xp' => (int) ($profile['current_level_xp'] ?? 0),
            'next_level_xp' => isset($profile['next_level_xp']) ? (int) $profile['next_level_xp'] : null,
        ],
        'totals' => [
            'distinct_fallas_visited' => (int) ($profile['distinct_fallas_visited'] ?? 0),
            'total_visit_events' => (int) ($profile['total_visit_events'] ?? 0),
            'routes_completed' => (int) ($profile['routes_completed'] ?? 0),
            'routes_started' => (int) ($profile['routes_started'] ?? 0),
            'neighborhoods_explored' => (int) ($profile['neighborhoods_explored'] ?? 0),
            'neighborhoods_completed' => (int) ($profile['neighborhoods_completed'] ?? 0),
            'badges_unlocked' => (int) ($profile['badges_unlocked'] ?? 0),
            'favorite_fallas_count' => (int) ($profile['favorite_fallas_count'] ?? 0),
            'content_reads_count' => (int) ($profile['content_reads_count'] ?? 0),
            'navigation_uses_count' => (int) ($profile['navigation_uses_count'] ?? 0),
        ],
        'progress' => [
            'total_progress_percent' => round((float) ($profile['total_progress_percent'] ?? 0), 2),
            'fallas_completion_percent' => round((float) ($profile['fallas_completion_percent'] ?? 0), 2),
        ],
        'last_activity_at' => $profile['last_activity_at'] ?? null,
    ];
}

function gamification_notification_payload(string $type, string $title, string $message, array $payload = []): array
{
    return [
        'type' => $type,
        'title' => $title,
        'message' => $message,
        'payload' => $payload,
    ];
}
