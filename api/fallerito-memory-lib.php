<?php
declare(strict_types=1);

function fallerito_memory_string(mixed $value, int $maxLength = 160): string
{
    $text = trim((string) $value);
    $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
    return mb_substr($text, 0, $maxLength, 'UTF-8');
}

function fallerito_memory_normalize(string $value): string
{
    $value = mb_strtolower(trim($value), 'UTF-8');
    $transliterated = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    $normalized = is_string($transliterated) ? $transliterated : $value;
    $normalized = preg_replace('/[^a-z0-9\s]/', ' ', $normalized) ?? $normalized;
    return trim(preg_replace('/\s+/', ' ', $normalized) ?? $normalized);
}

function fallerito_memory_user_id(array $user): ?int
{
    $userId = isset($user['id']) ? (int) $user['id'] : 0;
    return $userId > 0 ? $userId : null;
}

function fallerito_memory_supported_languages(): array
{
    return ['es', 'val', 'en'];
}

function fallerito_memory_known_zones(): array
{
    return [
        'ayuntamiento',
        'ruzafa',
        'russafa',
        'carmen',
        'centro',
        'ciutat vella',
        'benimaclet',
        'gran via',
        'alameda',
        'colon',
        'xativa',
        'cabanyal',
        'malvarrosa',
        'mestalla',
    ];
}

function fallerito_memory_default(): array
{
    return [
        'language' => 'es',
        'prefersWalking' => null,
        'avoidsCrowds' => null,
        'foodInterestLevel' => 0,
        'favoriteZones' => [],
        'zoneCounts' => [],
        'updatedAt' => null,
    ];
}

function fallerito_memory_ensure_table(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;

    db()->exec("CREATE TABLE IF NOT EXISTS fallerito_user_memory (
        user_id INT UNSIGNED NOT NULL PRIMARY KEY,
        preferred_language VARCHAR(12) NOT NULL DEFAULT 'es',
        prefers_walking TINYINT(1) NULL,
        avoids_crowds TINYINT(1) NULL,
        food_interest_count INT UNSIGNED NOT NULL DEFAULT 0,
        favorite_zones_json TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fallerito_user_memory_updated_at (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function fallerito_memory_zone_counts(mixed $value): array
{
    if (!is_string($value) || trim($value) === '') {
        return [];
    }

    $decoded = json_decode($value, true);
    if (!is_array($decoded)) {
        return [];
    }

    $counts = [];
    foreach ($decoded as $zone => $count) {
        $normalizedZone = fallerito_memory_string($zone, 80);
        if ($normalizedZone === '') {
            continue;
        }
        $counts[$normalizedZone] = max(0, (int) $count);
    }

    arsort($counts);
    return array_slice($counts, 0, 8, true);
}

function fallerito_memory_top_zones(array $zoneCounts): array
{
    if ($zoneCounts === []) {
        return [];
    }

    arsort($zoneCounts);
    return array_values(array_slice(array_keys($zoneCounts), 0, 3));
}

function fallerito_memory_hydrate(array $row): array
{
    $memory = fallerito_memory_default();
    $language = fallerito_memory_string($row['preferred_language'] ?? 'es', 12);
    $zoneCounts = fallerito_memory_zone_counts($row['favorite_zones_json'] ?? null);

    return [
        'language' => in_array($language, fallerito_memory_supported_languages(), true) ? $language : 'es',
        'prefersWalking' => array_key_exists('prefers_walking', $row) && $row['prefers_walking'] !== null ? (bool) ((int) $row['prefers_walking']) : null,
        'avoidsCrowds' => array_key_exists('avoids_crowds', $row) && $row['avoids_crowds'] !== null ? (bool) ((int) $row['avoids_crowds']) : null,
        'foodInterestLevel' => min(12, max(0, (int) ($row['food_interest_count'] ?? 0))),
        'favoriteZones' => fallerito_memory_top_zones($zoneCounts),
        'zoneCounts' => $zoneCounts,
        'updatedAt' => isset($row['updated_at']) ? (string) $row['updated_at'] : $memory['updatedAt'],
    ];
}

function fallerito_memory_get(array $user): array
{
    $userId = fallerito_memory_user_id($user);
    if ($userId === null) {
        return fallerito_memory_default();
    }

    fallerito_memory_ensure_table();
    $statement = db()->prepare(
        'SELECT preferred_language, prefers_walking, avoids_crowds, food_interest_count, favorite_zones_json, updated_at
         FROM fallerito_user_memory
         WHERE user_id = :user_id
         LIMIT 1'
    );
    $statement->execute(['user_id' => $userId]);
    $row = $statement->fetch();

    return is_array($row) ? fallerito_memory_hydrate($row) : fallerito_memory_default();
}

function fallerito_memory_detect_zones(string $message): array
{
    $normalized = fallerito_memory_normalize($message);
    $zones = [];
    foreach (fallerito_memory_known_zones() as $zone) {
        if (str_contains($normalized, fallerito_memory_normalize($zone))) {
            $zones[] = $zone;
        }
    }

    return array_values(array_unique($zones));
}

function fallerito_memory_extract_updates(string $message, string $intent, array $settings = []): array
{
    $normalized = fallerito_memory_normalize($message . ' ' . $intent);
    $updates = [];
    $language = fallerito_memory_string($settings['language'] ?? '', 12);

    if (in_array($language, fallerito_memory_supported_languages(), true)) {
        $updates['language'] = $language;
    }

    if (preg_match('/\b(andando|a pie|caminando)\b/u', $normalized) === 1) {
        $updates['prefersWalking'] = true;
    } elseif (preg_match('/\b(coche|parking|aparcar|taxi|metro|bus|autobus|tranvia|tren|emt)\b/u', $normalized) === 1) {
        $updates['prefersWalking'] = false;
    }

    if (preg_match('/\b(evito multitudes|evito la gente|menos gente|tranquilo|tranquila|sin aglomeraciones|sin mucha gente)\b/u', $normalized) === 1) {
        $updates['avoidsCrowds'] = true;
    } elseif (preg_match('/\b(mucho ambiente|me da igual la gente|no me importan las multitudes)\b/u', $normalized) === 1) {
        $updates['avoidsCrowds'] = false;
    }

    if (
        $intent === 'comida'
        || preg_match('/\b(comer|comida|cenar|restaurante|bunuelos|horchata|paella|tapas)\b/u', $normalized) === 1
    ) {
        $updates['foodInterestDelta'] = 1;
    }

    $zones = fallerito_memory_detect_zones($message);
    if ($zones !== []) {
        $updates['zones'] = $zones;
    }

    return $updates;
}

function fallerito_memory_merge(array $memory, array $updates): array
{
    $next = $memory;

    if (isset($updates['language']) && in_array($updates['language'], fallerito_memory_supported_languages(), true)) {
        $next['language'] = $updates['language'];
    }

    if (array_key_exists('prefersWalking', $updates)) {
        $next['prefersWalking'] = $updates['prefersWalking'] === null ? null : (bool) $updates['prefersWalking'];
    }

    if (array_key_exists('avoidsCrowds', $updates)) {
        $next['avoidsCrowds'] = $updates['avoidsCrowds'] === null ? null : (bool) $updates['avoidsCrowds'];
    }

    if (isset($updates['foodInterestDelta'])) {
        $next['foodInterestLevel'] = min(12, max(0, (int) $next['foodInterestLevel'] + (int) $updates['foodInterestDelta']));
    } elseif (isset($updates['foodInterestLevel'])) {
        $next['foodInterestLevel'] = min(12, max(0, (int) $updates['foodInterestLevel']));
    }

    $zoneCounts = is_array($next['zoneCounts'] ?? null) ? $next['zoneCounts'] : [];
    if (isset($updates['zones']) && is_array($updates['zones'])) {
        foreach ($updates['zones'] as $zone) {
            $normalizedZone = fallerito_memory_string($zone, 80);
            if ($normalizedZone === '') {
                continue;
            }
            $zoneCounts[$normalizedZone] = min(20, ((int) ($zoneCounts[$normalizedZone] ?? 0)) + 1);
        }
    }
    arsort($zoneCounts);
    $next['zoneCounts'] = array_slice($zoneCounts, 0, 8, true);
    $next['favoriteZones'] = fallerito_memory_top_zones($next['zoneCounts']);

    return $next;
}

function fallerito_memory_save(array $user, array $memory): array
{
    $userId = fallerito_memory_user_id($user);
    if ($userId === null) {
        return fallerito_memory_default();
    }

    fallerito_memory_ensure_table();
    $zoneCounts = is_array($memory['zoneCounts'] ?? null) ? $memory['zoneCounts'] : [];
    $encodedZones = json_encode($zoneCounts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $statement = db()->prepare(
        "INSERT INTO fallerito_user_memory (
            user_id,
            preferred_language,
            prefers_walking,
            avoids_crowds,
            food_interest_count,
            favorite_zones_json
        ) VALUES (
            :user_id,
            :preferred_language,
            :prefers_walking,
            :avoids_crowds,
            :food_interest_count,
            :favorite_zones_json
        )
        ON DUPLICATE KEY UPDATE
            preferred_language = VALUES(preferred_language),
            prefers_walking = VALUES(prefers_walking),
            avoids_crowds = VALUES(avoids_crowds),
            food_interest_count = VALUES(food_interest_count),
            favorite_zones_json = VALUES(favorite_zones_json),
            updated_at = CURRENT_TIMESTAMP"
    );
    $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $statement->bindValue(':preferred_language', in_array($memory['language'] ?? '', fallerito_memory_supported_languages(), true) ? $memory['language'] : 'es', PDO::PARAM_STR);
    $statement->bindValue(':prefers_walking', $memory['prefersWalking'], $memory['prefersWalking'] === null ? PDO::PARAM_NULL : PDO::PARAM_BOOL);
    $statement->bindValue(':avoids_crowds', $memory['avoidsCrowds'], $memory['avoidsCrowds'] === null ? PDO::PARAM_NULL : PDO::PARAM_BOOL);
    $statement->bindValue(':food_interest_count', min(12, max(0, (int) ($memory['foodInterestLevel'] ?? 0))), PDO::PARAM_INT);
    $statement->bindValue(':favorite_zones_json', is_string($encodedZones) ? $encodedZones : '{}', PDO::PARAM_STR);
    $statement->execute();

    return fallerito_memory_get($user);
}

function fallerito_memory_learn(array $user, array $memory, string $message, string $intent, array $settings = []): array
{
    $updates = fallerito_memory_extract_updates($message, $intent, $settings);
    if ($updates === []) {
        return $memory;
    }

    return fallerito_memory_save($user, fallerito_memory_merge($memory, $updates));
}

function fallerito_memory_patch(array $user, array $patch): array
{
    if (($patch['reset'] ?? false) === true) {
        $userId = fallerito_memory_user_id($user);
        if ($userId !== null) {
            fallerito_memory_ensure_table();
            $statement = db()->prepare('DELETE FROM fallerito_user_memory WHERE user_id = :user_id');
            $statement->execute(['user_id' => $userId]);
        }
        return fallerito_memory_default();
    }

    $memory = fallerito_memory_get($user);
    $updates = [];

    if (isset($patch['language'])) {
        $updates['language'] = fallerito_memory_string($patch['language'], 12);
    }
    if (array_key_exists('prefersWalking', $patch)) {
        $updates['prefersWalking'] = $patch['prefersWalking'] === null ? null : (bool) $patch['prefersWalking'];
    }
    if (array_key_exists('avoidsCrowds', $patch)) {
        $updates['avoidsCrowds'] = $patch['avoidsCrowds'] === null ? null : (bool) $patch['avoidsCrowds'];
    }
    if (isset($patch['foodInterestLevel'])) {
        $updates['foodInterestLevel'] = (int) $patch['foodInterestLevel'];
    }
    if (isset($patch['favoriteZones']) && is_array($patch['favoriteZones'])) {
        $updates['zones'] = array_slice(array_values(array_filter(array_map(
            static fn (mixed $zone): string => fallerito_memory_string($zone, 80),
            $patch['favoriteZones']
        ))), 0, 3);
    }

    return fallerito_memory_save($user, fallerito_memory_merge($memory, $updates));
}

function fallerito_memory_context(array $memory): string
{
    $lines = [];

    if (($memory['prefersWalking'] ?? null) === true) {
        $lines[] = 'Suele desplazarse andando.';
    }
    if (($memory['avoidsCrowds'] ?? null) === true) {
        $lines[] = 'Prefiere evitar multitudes y zonas demasiado saturadas.';
    }
    if ((int) ($memory['foodInterestLevel'] ?? 0) >= 2) {
        $lines[] = 'Suele valorar planes con parada para comer o cenar.';
    }
    if (!empty($memory['favoriteZones']) && is_array($memory['favoriteZones'])) {
        $lines[] = 'Sus zonas favoritas o habituales son: ' . implode(', ', array_slice($memory['favoriteZones'], 0, 3)) . '.';
    }

    return $lines === [] ? '' : 'Memoria persistente del usuario: ' . implode(' ', $lines);
}

function fallerito_memory_augment_message(string $message, array $memory, string $intent, ?array $userPosition): string
{
    $normalized = fallerito_memory_normalize($message . ' ' . $intent);
    $augments = [];
    $isPlanningLike = preg_match('/\b(plan|planifica|ruta|itinerario|falla|fallas|mascleta|cerca|que hago hoy)\b/u', $normalized) === 1
        || in_array($intent, ['buscar_falla', 'crear_ruta', 'buscar_mascleta', 'horarios', 'transporte'], true);

    if (($memory['prefersWalking'] ?? null) === true && $isPlanningLike && preg_match('/\b(andando|a pie|caminando|metro|bus|autobus|taxi|coche|parking|aparcar)\b/u', $normalized) !== 1) {
        $augments[] = 'voy andando';
    }

    if (($memory['avoidsCrowds'] ?? null) === true && $isPlanningLike && preg_match('/\b(evito multitudes|menos gente|tranquilo|sin aglomeraciones)\b/u', $normalized) !== 1) {
        $augments[] = 'evito multitudes';
    }

    if ((int) ($memory['foodInterestLevel'] ?? 0) >= 2 && $isPlanningLike && preg_match('/\b(comer|comida|cenar|restaurante|bunuelos|horchata|paella|tapas)\b/u', $normalized) !== 1) {
        $augments[] = 'quiero comer cerca';
    }

    if ($userPosition === null && !empty($memory['favoriteZones'][0]) && $isPlanningLike) {
        $hasZone = fallerito_memory_detect_zones($message) !== [];
        if (!$hasZone) {
            $augments[] = 'mi zona habitual es ' . fallerito_memory_string($memory['favoriteZones'][0], 80);
        }
    }

    if ($augments === []) {
        return $message;
    }

    return rtrim($message, ". \t\n\r\0\x0B") . '. Preferencias recordadas: ' . implode(', ', $augments) . '.';
}
