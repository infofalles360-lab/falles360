<?php
declare(strict_types=1);

const TELEGRAM_PENDING_LINK_MAX_AGE = 21600;
const TELEGRAM_PENDING_PUBLICATION_MAX_AGE = 604800;

function telegram_env(string $key, ?string $default = null): ?string
{
    static $envBootstrapped = false;

    if (!$envBootstrapped) {
        if (function_exists('falles360_load_env_files')) {
            falles360_load_env_files();
        } else {
            require_once dirname(__DIR__) . '/backend/config.php';
        }

        $envBootstrapped = true;
    }

    $value = getenv($key);

    if ($value === false) {
        return $default;
    }

    $trimmed = trim((string) $value);

    return $trimmed !== '' ? $trimmed : $default;
}

function telegram_is_configured(): bool
{
    return telegram_env('TELEGRAM_BOT_TOKEN') !== null;
}

function telegram_bot_username(): ?string
{
    return telegram_env('TELEGRAM_BOT_USERNAME');
}

function telegram_webhook_secret(): ?string
{
    return telegram_env('TELEGRAM_WEBHOOK_SECRET');
}

function telegram_channel_id(): string
{
    $configuredTarget = telegram_env('TELEGRAM_CHANNEL_ID')
        ?? telegram_env('TELEGRAM_CHANNEL_CHAT_ID')
        ?? telegram_env('TELEGRAM_CHANNEL_USERNAME');

    if ($configuredTarget === null) {
        return '@Falles360';
    }

    if (str_starts_with($configuredTarget, '@') || str_starts_with($configuredTarget, '-')) {
        return $configuredTarget;
    }

    return '@' . $configuredTarget;
}

function telegram_escape_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function telegram_normalize_message_lines(mixed $value): array
{
    if (is_array($value)) {
        $lines = [];

        foreach ($value as $line) {
            $normalized = trim((string) $line);

            if ($normalized !== '') {
                $lines[] = $normalized;
            }
        }

        return $lines;
    }

    $normalized = trim((string) $value);

    if ($normalized === '') {
        return [];
    }

    return array_values(array_filter(
        array_map(
            static fn (string $line): string => trim($line),
            preg_split('/\r?\n/', $normalized) ?: []
        ),
        static fn (string $line): bool => $line !== ''
    ));
}

function telegram_build_channel_message(array $payload): string
{
    $templates = [
        'aviso' => ['icon' => "\u{1F6A8}", 'label' => 'AVISO'],
        'novedad' => ['icon' => "\u{1F4F0}", 'label' => 'NOVEDAD'],
        'ruta' => ['icon' => "\u{1F4CD}", 'label' => 'RUTA RECOMENDADA'],
    ];

    $type = strtolower(trim((string) ($payload['type'] ?? '')));
    $selected = $templates[$type] ?? ['icon' => "\u{1F4E2}", 'label' => 'INFORMACION'];
    $title = trim((string) ($payload['title'] ?? ''));
    $detailLines = telegram_normalize_message_lines($payload['detail'] ?? '');
    $location = trim((string) ($payload['location'] ?? ''));
    $footer = trim((string) ($payload['footer'] ?? ''));

    $text = $selected['icon'] . ' <b>' . telegram_escape_html($selected['label']) . "</b>\n\n";
    $text .= '<b>' . telegram_escape_html($title) . "</b>\n";

    foreach ($detailLines as $line) {
        $text .= telegram_escape_html($line) . "\n";
    }

    if ($location !== '') {
        $text .= "\u{1F4CD} " . telegram_escape_html($location) . "\n";
    }

    if ($footer !== '') {
        $text .= "\n" . telegram_escape_html($footer);
    }

    return trim($text);
}

function telegram_truncate_plain_text(string $text, int $maxLength, string $suffix = '...'): string
{
    $normalized = trim($text);

    if ($normalized === '') {
        return '';
    }

    if (telegram_text_length($normalized) <= $maxLength) {
        return $normalized;
    }

    $normalizedSuffix = trim($suffix);
    $suffixText = $normalizedSuffix !== '' ? "\n\n" . $normalizedSuffix : '';
    $sliceLength = max(1, $maxLength - telegram_text_length($suffixText));

    return rtrim(telegram_text_slice($normalized, 0, $sliceLength)) . '…';
}

function telegram_truncate_plain_text_with_suffix(string $text, int $maxLength, string $suffix): string
{
    $normalized = trim($text);

    if ($normalized === '') {
        return '';
    }

    if (telegram_text_length($normalized) <= $maxLength) {
        return $normalized;
    }

    $normalizedSuffix = trim($suffix);
    $suffixText = $normalizedSuffix !== '' ? "\n\n" . $normalizedSuffix : '';
    $sliceLength = max(1, $maxLength - telegram_text_length($suffixText));

    return rtrim(telegram_text_slice($normalized, 0, $sliceLength)) . $suffixText;
}

function telegram_build_channel_publication_text(array $payload, int $maxLength = 4000): string
{
    $footer = trim((string) ($payload['footer'] ?? ''));
    $fullText = trim((string) ($payload['fullText'] ?? ''));

    if ($fullText === '') {
        return telegram_build_channel_message(array_merge($payload, [
            'footer' => $footer !== '' ? $footer : 'Consulta mas detalles en la app.',
        ]));
    }

    $templates = [
        'aviso' => ['icon' => "\u{1F6A8}", 'label' => 'AVISO'],
        'novedad' => ['icon' => "\u{1F4F0}", 'label' => 'NOVEDAD'],
        'ruta' => ['icon' => "\u{1F4CD}", 'label' => 'RUTA RECOMENDADA'],
    ];

    $type = strtolower(trim((string) ($payload['type'] ?? '')));
    $selected = $templates[$type] ?? ['icon' => "\u{1F4E2}", 'label' => 'INFORMACION'];
    $location = trim((string) ($payload['location'] ?? ''));
    $lines = [
        $selected['icon'] . ' ' . $selected['label'],
        '',
        $fullText,
    ];

    if ($location !== '') {
        $lines[] = '';
        $lines[] = "\u{1F4CD} " . $location;
    }

    if ($footer !== '') {
        $lines[] = '';
        $lines[] = $footer;
    }

    return telegram_truncate_plain_text_with_suffix(
        trim(implode("\n", $lines)),
        $maxLength,
        'Leer mas en el articulo.'
    );
}

function telegram_build_direct_alert_message(array $payload): string
{
    $labels = [
        'aviso' => "\u{1F6A8} AVISO",
        'novedad' => "\u{1F4F0} NOVEDAD",
        'ruta' => "\u{1F4CD} RUTA RECOMENDADA",
    ];

    $type = strtolower(trim((string) ($payload['type'] ?? '')));
    $title = trim((string) ($payload['title'] ?? ''));
    $detailLines = telegram_normalize_message_lines($payload['detail'] ?? '');
    $location = trim((string) ($payload['location'] ?? ''));
    $footer = trim((string) ($payload['footer'] ?? ''));

    $text = ($labels[$type] ?? "\u{1F4E2} INFORMACION") . "\n\n" . $title . "\n";

    foreach ($detailLines as $line) {
        $text .= $line . "\n";
    }

    if ($location !== '') {
        $text .= "\u{1F4CD} " . $location . "\n";
    }

    if ($footer !== '') {
        $text .= "\n" . $footer;
    }

    return trim($text);
}

function telegram_build_reply_markup(?string $buttonText, ?string $buttonUrl): array
{
    $text = trim((string) ($buttonText ?? ''));
    $url = trim((string) ($buttonUrl ?? ''));

    if ($text === '' || $url === '') {
        return [];
    }

    return [
        'reply_markup' => [
            'inline_keyboard' => [
                [
                    [
                        'text' => $text,
                        'url' => $url,
                    ],
                ],
            ],
        ],
    ];
}

function telegram_build_inline_keyboard_markup(array $rows): array
{
    return [
        'reply_markup' => [
            'inline_keyboard' => $rows,
        ],
    ];
}

function telegram_store_path(): string
{
    return dirname(__DIR__) . '/dashboard/server/runtime/telegram-store.json';
}

function telegram_default_store_state(): array
{
    return [
        'lastUpdateId' => 0,
        'pendingLinks' => [],
        'pendingPublications' => [],
        'linkedUsers' => [],
    ];
}

function telegram_normalize_user_id(mixed $userId): ?string
{
    $normalized = trim((string) $userId);

    return $normalized !== '' ? $normalized : null;
}

function telegram_normalize_store(array $state): array
{
    return [
        'lastUpdateId' => isset($state['lastUpdateId']) ? (int) $state['lastUpdateId'] : 0,
        'pendingLinks' => isset($state['pendingLinks']) && is_array($state['pendingLinks']) ? $state['pendingLinks'] : [],
        'pendingPublications' => isset($state['pendingPublications']) && is_array($state['pendingPublications']) ? $state['pendingPublications'] : [],
        'linkedUsers' => isset($state['linkedUsers']) && is_array($state['linkedUsers']) ? $state['linkedUsers'] : [],
    ];
}

function telegram_cleanup_pending_links(array &$state, ?int $now = null): void
{
    $now ??= time();

    foreach ($state['pendingLinks'] as $token => $entry) {
        $createdAt = isset($entry['createdAt']) ? strtotime((string) $entry['createdAt']) : false;

        if ($createdAt === false || ($now - $createdAt) > TELEGRAM_PENDING_LINK_MAX_AGE) {
            unset($state['pendingLinks'][$token]);
        }
    }
}

function telegram_cleanup_pending_publications(array &$state, ?int $now = null): void
{
    $now ??= time();

    foreach ($state['pendingPublications'] as $token => $entry) {
        $createdAt = isset($entry['createdAt']) ? strtotime((string) $entry['createdAt']) : false;

        if ($createdAt === false || ($now - $createdAt) > TELEGRAM_PENDING_PUBLICATION_MAX_AGE) {
            unset($state['pendingPublications'][$token]);
        }
    }
}

function telegram_read_store(): array
{
    $filePath = telegram_store_path();

    if (!is_file($filePath)) {
        return telegram_default_store_state();
    }

    $raw = file_get_contents($filePath);

    if (!is_string($raw) || trim($raw) === '') {
        return telegram_default_store_state();
    }

    $decoded = json_decode($raw, true);

    if (!is_array($decoded)) {
        return telegram_default_store_state();
    }

    $state = telegram_normalize_store($decoded);
    telegram_cleanup_pending_links($state);
    telegram_cleanup_pending_publications($state);

    return $state;
}

function telegram_write_store(array $state): void
{
    $filePath = telegram_store_path();
    $directory = dirname($filePath);

    if (!is_dir($directory)) {
        mkdir($directory, 0775, true);
    }

    telegram_cleanup_pending_links($state);
    telegram_cleanup_pending_publications($state);

    file_put_contents(
        $filePath,
        json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function telegram_mark_update_as_processed(int $updateId): void
{
    if ($updateId <= 0) {
        return;
    }

    $state = telegram_read_store();
    $nextOffset = $updateId + 1;

    if ((int) ($state['lastUpdateId'] ?? 0) >= $nextOffset) {
        return;
    }

    $state['lastUpdateId'] = $nextOffset;
    telegram_write_store($state);
}

function telegram_mark_payload_update_as_processed(array $payload): void
{
    $updateId = isset($payload['update_id']) ? (int) $payload['update_id'] : 0;

    if ($updateId > 0) {
        telegram_mark_update_as_processed($updateId);
    }
}

function telegram_generate_link_token(): string
{
    return bin2hex(random_bytes(16));
}

function telegram_status_for_user(mixed $userId): array
{
    $normalizedUserId = telegram_normalize_user_id($userId);

    if ($normalizedUserId === null) {
        return [
            'linked' => false,
            'telegramUsername' => null,
            'linkedAt' => null,
        ];
    }

    $state = telegram_read_store();
    $record = $state['linkedUsers'][$normalizedUserId] ?? null;

    if (!is_array($record)) {
        return [
            'linked' => false,
            'telegramUsername' => null,
            'linkedAt' => null,
        ];
    }

    return [
        'linked' => isset($record['chatId']) && $record['chatId'] !== null && $record['chatId'] !== '',
        'telegramUsername' => isset($record['telegramUsername']) && trim((string) $record['telegramUsername']) !== ''
            ? trim((string) $record['telegramUsername'])
            : null,
        'linkedAt' => isset($record['linkedAt']) ? (string) $record['linkedAt'] : null,
    ];
}

function telegram_get_linked_user(mixed $userId): ?array
{
    $normalizedUserId = telegram_normalize_user_id($userId);

    if ($normalizedUserId === null) {
        return null;
    }

    $state = telegram_read_store();
    $record = $state['linkedUsers'][$normalizedUserId] ?? null;

    if (!is_array($record)) {
        return null;
    }

    return [
        'userId' => $normalizedUserId,
        'chatId' => $record['chatId'] ?? null,
        'telegramUsername' => isset($record['telegramUsername']) && trim((string) $record['telegramUsername']) !== ''
            ? trim((string) $record['telegramUsername'])
            : null,
        'linkedAt' => isset($record['linkedAt']) ? (string) $record['linkedAt'] : null,
    ];
}

function telegram_linked_users(): array
{
    $state = telegram_read_store();
    $linkedUsers = [];

    foreach ($state['linkedUsers'] as $userId => $record) {
        $chatId = $record['chatId'] ?? null;

        if ($chatId === null || $chatId === '') {
            continue;
        }

        $linkedUsers[] = [
            'userId' => (string) $userId,
            'chatId' => $chatId,
            'telegramUsername' => isset($record['telegramUsername']) && trim((string) $record['telegramUsername']) !== ''
                ? trim((string) $record['telegramUsername'])
                : null,
            'linkedAt' => isset($record['linkedAt']) ? (string) $record['linkedAt'] : null,
        ];
    }

    return $linkedUsers;
}

function telegram_create_pending_link(mixed $userId, string $token): void
{
    $normalizedUserId = telegram_normalize_user_id($userId);

    if ($normalizedUserId === null) {
        throw new InvalidArgumentException('Falta un userId valido.');
    }

    $state = telegram_read_store();

    foreach ($state['pendingLinks'] as $existingToken => $entry) {
        if (($entry['userId'] ?? null) === $normalizedUserId) {
            unset($state['pendingLinks'][$existingToken]);
        }
    }

    $state['pendingLinks'][$token] = [
        'userId' => $normalizedUserId,
        'createdAt' => date('c'),
    ];

    telegram_write_store($state);
}

function telegram_consume_pending_link(string $token): ?string
{
    $normalizedToken = trim($token);

    if ($normalizedToken === '') {
        return null;
    }

    $state = telegram_read_store();
    $entry = $state['pendingLinks'][$normalizedToken] ?? null;

    if (!is_array($entry) || !isset($entry['userId'])) {
        return null;
    }

    unset($state['pendingLinks'][$normalizedToken]);
    telegram_write_store($state);

    return telegram_normalize_user_id($entry['userId']);
}

function telegram_set_linked_user(mixed $userId, mixed $chatId, ?string $telegramUsername = null): array
{
    $normalizedUserId = telegram_normalize_user_id($userId);

    if ($normalizedUserId === null) {
        throw new InvalidArgumentException('Falta un userId valido.');
    }

    $state = telegram_read_store();

    foreach ($state['linkedUsers'] as $existingUserId => $record) {
        if ((string) ($record['chatId'] ?? '') === (string) $chatId) {
            unset($state['linkedUsers'][$existingUserId]);
        }
    }

    $state['linkedUsers'][$normalizedUserId] = [
        'chatId' => $chatId,
        'telegramUsername' => trim((string) ($telegramUsername ?? '')),
        'linkedAt' => date('c'),
    ];

    telegram_write_store($state);

    return telegram_get_linked_user($normalizedUserId) ?? [
        'userId' => $normalizedUserId,
        'chatId' => $chatId,
        'telegramUsername' => $telegramUsername,
        'linkedAt' => date('c'),
    ];
}

function telegram_get_linked_user_by_chat_id(mixed $chatId): ?array
{
    $normalizedChatId = trim((string) $chatId);

    if ($normalizedChatId === '') {
        return null;
    }

    $state = telegram_read_store();

    foreach ($state['linkedUsers'] as $userId => $record) {
        if ((string) ($record['chatId'] ?? '') !== $normalizedChatId) {
            continue;
        }

        return [
            'userId' => (string) $userId,
            'chatId' => $normalizedChatId,
            'telegramUsername' => isset($record['telegramUsername']) && trim((string) $record['telegramUsername']) !== ''
                ? trim((string) $record['telegramUsername'])
                : null,
            'linkedAt' => isset($record['linkedAt']) ? (string) $record['linkedAt'] : null,
        ];
    }

    return null;
}

function telegram_is_channel_editor_chat(mixed $chatId): bool
{
    $linkedUser = telegram_get_linked_user_by_chat_id($chatId);

    if (!is_array($linkedUser)) {
        return false;
    }

    $userId = (int) ($linkedUser['userId'] ?? 0);

    if ($userId <= 0) {
        return false;
    }

    $statement = db()->prepare(
        "SELECT role, status
         FROM users
         WHERE id = :id
         LIMIT 1"
    );
    $statement->execute(['id' => $userId]);
    $row = $statement->fetch();

    if (!is_array($row)) {
        return false;
    }

    $status = trim((string) ($row['status'] ?? ''));
    $role = trim((string) ($row['role'] ?? ''));

    return $status === 'active' && in_array($role, ['admin', 'support'], true);
}

function telegram_generate_publication_token(): string
{
    return bin2hex(random_bytes(16));
}

function telegram_normalize_channel_payload(array $payload): array
{
    return [
        'type' => trim((string) ($payload['type'] ?? 'novedad')),
        'title' => trim((string) ($payload['title'] ?? '')),
        'detail' => trim((string) ($payload['detail'] ?? '')),
        'location' => trim((string) ($payload['location'] ?? '')),
        'footer' => trim((string) ($payload['footer'] ?? '')),
        'buttonText' => trim((string) ($payload['buttonText'] ?? '')),
        'buttonUrl' => trim((string) ($payload['buttonUrl'] ?? '')),
        'imageUrl' => trim((string) ($payload['imageUrl'] ?? '')),
        'imageStyle' => trim((string) ($payload['imageStyle'] ?? '')),
        'fullText' => trim((string) ($payload['fullText'] ?? '')),
        'target' => 'channel',
    ];
}

function telegram_create_pending_publication(mixed $chatId, array $payload, array $meta = []): string
{
    $normalizedChatId = trim((string) $chatId);

    if ($normalizedChatId === '') {
        throw new InvalidArgumentException('Falta un chatId valido para preparar la publicacion.');
    }

    $state = telegram_read_store();
    $token = telegram_generate_publication_token();
    $state['pendingPublications'][$token] = [
        'chatId' => $normalizedChatId,
        'payload' => telegram_normalize_channel_payload($payload),
        'meta' => $meta,
        'createdAt' => date('c'),
    ];
    telegram_write_store($state);

    return $token;
}

function telegram_get_pending_publication(string $token, mixed $chatId = null): ?array
{
    $normalizedToken = trim($token);

    if ($normalizedToken === '') {
        return null;
    }

    $state = telegram_read_store();
    $entry = $state['pendingPublications'][$normalizedToken] ?? null;

    if (!is_array($entry)) {
        return null;
    }

    if ($chatId !== null && (string) ($entry['chatId'] ?? '') !== trim((string) $chatId)) {
        return null;
    }

    return [
        'token' => $normalizedToken,
        'chatId' => (string) ($entry['chatId'] ?? ''),
        'payload' => is_array($entry['payload'] ?? null) ? $entry['payload'] : [],
        'meta' => is_array($entry['meta'] ?? null) ? $entry['meta'] : [],
        'createdAt' => isset($entry['createdAt']) ? (string) $entry['createdAt'] : null,
    ];
}

function telegram_remove_pending_publication(string $token): void
{
    $normalizedToken = trim($token);

    if ($normalizedToken === '') {
        return;
    }

    $state = telegram_read_store();

    if (!isset($state['pendingPublications'][$normalizedToken])) {
        return;
    }

    unset($state['pendingPublications'][$normalizedToken]);
    telegram_write_store($state);
}

function telegram_finalize_pending_publication(array $pending): void
{
    $meta = is_array($pending['meta'] ?? null) ? $pending['meta'] : [];
    $action = trim((string) ($meta['action'] ?? ''));
    $userId = (int) ($meta['userId'] ?? 0);
    $articleIds = isset($meta['articleIds']) && is_array($meta['articleIds']) ? $meta['articleIds'] : [];

    if ($articleIds !== []) {
        cendra_mark_articles_telegram_sent($articleIds);
    }

    if ($action === 'cendra_article') {
        $articleId = (int) ($meta['articleId'] ?? 0);

        if ($articleId > 0) {
            cendra_mark_article_telegram_sent($articleId);
        }

        if ($userId > 0) {
            write_access_log(
                $userId,
                'cendra_publish_channel_approved',
                'cendra_articles',
                $articleId > 0 ? $articleId : null,
                'Articulo de Cendra publicado en el canal tras confirmacion desde Telegram.'
            );
        }

        return;
    }

    if ($userId > 0 && $action !== '') {
        write_access_log(
            $userId,
            $action,
            'cendra_articles',
            null,
            'Publicacion aprobada en el canal desde Telegram.'
        );
    }
}

function telegram_build_channel_review_text(array $payload, array $meta = []): string
{
    $lines = [
        '🧾 BORRADOR PARA EL CANAL',
        '',
        'Todavia no se ha publicado. Revisa el contenido y pulsa confirmar cuando quieras.',
    ];
    $query = trim((string) ($meta['query'] ?? ''));

    if ($query !== '') {
        $lines[] = 'Consulta: "' . $query . '"';
    }

    $lines[] = '';
    $lines[] = telegram_build_direct_alert_message($payload);

    if (trim((string) ($payload['buttonUrl'] ?? '')) !== '') {
        $lines[] = '';
        $lines[] = 'Fuente: ' . trim((string) ($payload['buttonUrl'] ?? ''));
    }

    return trim(implode("\n", $lines));
}

function telegram_public_base_url(): ?string
{
    $configuredUrl = telegram_env('APP_URL');

    if ($configuredUrl !== null) {
        $normalizedConfiguredUrl = rtrim($configuredUrl, '/');

        if (!preg_match('#^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$#i', $normalizedConfiguredUrl)) {
            return $normalizedConfiguredUrl;
        }
    }

    if (!empty($_SERVER['HTTP_HOST'])) {
        $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        $scheme = $isHttps ? 'https' : 'http';

        return $scheme . '://' . $_SERVER['HTTP_HOST'] . app_base_url();
    }

    return $configuredUrl !== null ? rtrim($configuredUrl, '/') : null;
}

function telegram_public_app_url_for_messages(): ?string
{
    $baseUrl = telegram_public_base_url();

    if ($baseUrl === null) {
        return null;
    }

    $host = parse_url($baseUrl, PHP_URL_HOST);

    if (!is_string($host) || $host === '') {
        return null;
    }

    $normalizedHost = strtolower($host);

    if (in_array($normalizedHost, ['localhost', '127.0.0.1'], true)) {
        return null;
    }

    return rtrim($baseUrl, '/');
}

function telegram_webhook_url(): ?string
{
    $baseUrl = telegram_public_base_url();

    if ($baseUrl === null || !str_starts_with($baseUrl, 'https://')) {
        return null;
    }

    return $baseUrl . '/api/telegram/webhook.php';
}

function telegram_runtime_directory(string $subDirectory = ''): string
{
    $baseDirectory = dirname(__DIR__) . '/dashboard/server/runtime';

    if ($subDirectory === '') {
        if (!is_dir($baseDirectory)) {
            mkdir($baseDirectory, 0775, true);
        }

        return $baseDirectory;
    }

    $directory = $baseDirectory . '/' . trim(str_replace('\\', '/', $subDirectory), '/');

    if (!is_dir($directory)) {
        mkdir($directory, 0775, true);
    }

    return $directory;
}

function telegram_http_get_binary(string $url, int $timeoutSeconds = 20): string
{
    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        throw new InvalidArgumentException('La URL del recurso no es valida.');
    }

    if (function_exists('curl_init')) {
        $handle = curl_init($url);

        if ($handle === false) {
            throw new RuntimeException('No se pudo iniciar la descarga del recurso.');
        }

        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_USERAGENT => 'Falles360 Telegram Media/1.0',
        ]);

        $body = curl_exec($handle);
        $error = curl_error($handle);
        $statusCode = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle);

        if (!is_string($body)) {
            throw new RuntimeException($error !== '' ? $error : 'No se pudo descargar el recurso.');
        }

        if ($statusCode < 200 || $statusCode >= 300) {
            throw new RuntimeException('El recurso devolvio HTTP ' . $statusCode . '.');
        }

        return $body;
    }

    $context = stream_context_create([
        'http' => [
            'timeout' => $timeoutSeconds,
            'header' => "User-Agent: Falles360 Telegram Media/1.0\r\n",
        ],
    ]);

    $body = @file_get_contents($url, false, $context);

    if (!is_string($body)) {
        throw new RuntimeException('No se pudo descargar el recurso.');
    }

    return $body;
}

function telegram_build_cendra_cropped_photo(string $imageUrl): ?string
{
    if (!function_exists('imagecreatefromstring')) {
        return null;
    }

    $targetPath = telegram_runtime_directory('telegram-media') . '/' . sha1('cendra_crop_top_v5|' . $imageUrl) . '.jpg';

    if (is_file($targetPath) && filesize($targetPath) > 0) {
        return $targetPath;
    }

    try {
        $binary = telegram_http_get_binary($imageUrl, 20);
    } catch (Throwable) {
        return null;
    }

    $image = @imagecreatefromstring($binary);

    if (!$image) {
        return null;
    }

    $width = imagesx($image);
    $height = imagesy($image);
    $aspectRatio = $width / max(1, $height);

    if ($aspectRatio >= 1.0) {
        $cropTop = (int) round($height * 0.38);
    } elseif ($aspectRatio >= 0.78) {
        $cropTop = (int) round($height * 0.32);
    } else {
        $cropTop = (int) round($height * 0.28);
    }

    $cropTop = max(180, min($cropTop, (int) floor($height * 0.50)));
    $scanLimit = min((int) round($height * 0.52), 460);
    $rowStep = max(2, (int) floor($height / 180));
    $columnStep = max(4, (int) floor($width / 36));
    $lastLightRow = 0;
    $lightRowStreak = 0;
    $sawLightHeader = false;

    for ($y = 0; $y <= $scanLimit; $y += $rowStep) {
        $lightPixels = 0;
        $samples = 0;

        for ($x = 0; $x < $width; $x += $columnStep) {
            $rgb = imagecolorat($image, $x, $y);
            $red = ($rgb >> 16) & 0xFF;
            $green = ($rgb >> 8) & 0xFF;
            $blue = $rgb & 0xFF;
            $brightness = ($red + $green + $blue) / 3;
            $spread = max($red, $green, $blue) - min($red, $green, $blue);

            if ($brightness >= 225 && $spread <= 60) {
                $lightPixels++;
            }

            $samples++;
        }

        $lightRatio = $samples > 0 ? ($lightPixels / $samples) : 0.0;

        if ($lightRatio >= 0.52) {
            $sawLightHeader = true;
            $lightRowStreak++;
            $lastLightRow = $y;
            continue;
        }

        if ($sawLightHeader && $lightRowStreak >= 3) {
            break;
        }

        $lightRowStreak = 0;
    }

    if ($sawLightHeader && $lastLightRow > 0) {
        $cropTop = max(
            $cropTop,
            min((int) round($lastLightRow + ($rowStep * 5)), (int) floor($height * 0.56))
        );
    }

    if ($width < 200 || $height < 260 || $cropTop >= ($height - 160)) {
        imagedestroy($image);
        return null;
    }

    if (function_exists('imagecrop')) {
        $cropped = imagecrop($image, [
            'x' => 0,
            'y' => $cropTop,
            'width' => $width,
            'height' => $height - $cropTop,
        ]);
    } else {
        $cropped = imagecreatetruecolor($width, $height - $cropTop);

        if ($cropped !== false) {
            imagecopy($cropped, $image, 0, 0, 0, $cropTop, $width, $height - $cropTop);
        }
    }

    imagedestroy($image);

    if (!$cropped) {
        return null;
    }

    $croppedWidth = imagesx($cropped);
    $croppedHeight = imagesy($cropped);
    $maskWidth = min((int) round($croppedWidth * 0.48), 420);
    $maskHeight = min((int) round($croppedHeight * 0.20), 220);
    $sourceX = min(
        max($maskWidth + (int) round($croppedWidth * 0.08), 1),
        max($croppedWidth - 2, 1)
    );
    $sourceWidth = max(1, min($maskWidth, $croppedWidth - $sourceX));

    if ($maskWidth > 10 && $maskHeight > 10 && $sourceWidth > 0) {
        imagecopyresampled(
            $cropped,
            $cropped,
            0,
            0,
            $sourceX,
            0,
            $maskWidth,
            $maskHeight,
            $sourceWidth,
            $maskHeight
        );
    }

    imagejpeg($cropped, $targetPath, 90);
    imagedestroy($cropped);

    return is_file($targetPath) ? $targetPath : null;
}

function telegram_public_media_url_from_path(string $filePath): ?string
{
    $baseUrl = telegram_public_app_url_for_messages();

    if ($baseUrl === null) {
        return null;
    }

    $fileName = basename($filePath);

    if ($fileName === '') {
        return null;
    }

    return $baseUrl . '/api/telegram/media.php?file=' . rawurlencode($fileName);
}

function telegram_prepare_photo_input(string $imageUrl, string $imageStyle = ''): string|CURLFile|null
{
    $normalizedImageUrl = trim($imageUrl);

    if ($normalizedImageUrl === '') {
        return null;
    }

    if ($imageStyle === 'cendra_crop_top') {
        $croppedPath = telegram_build_cendra_cropped_photo($normalizedImageUrl);

        if ($croppedPath !== null && class_exists(CURLFile::class)) {
            return new CURLFile($croppedPath, 'image/jpeg', basename($croppedPath));
        }

        if ($croppedPath !== null) {
            return telegram_public_media_url_from_path($croppedPath);
        }

        return null;
    }

    return $normalizedImageUrl;
}

function telegram_value_contains_file(mixed $value): bool
{
    if ($value instanceof CURLFile) {
        return true;
    }

    if (!is_array($value)) {
        return false;
    }

    foreach ($value as $nestedValue) {
        if (telegram_value_contains_file($nestedValue)) {
            return true;
        }
    }

    return false;
}

function telegram_prepare_request_body(array $body, bool $multipart): array|string
{
    if (!$multipart) {
        $payload = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!is_string($payload)) {
            throw new RuntimeException('No se pudo codificar la peticion de Telegram.');
        }

        return $payload;
    }

    $prepared = [];

    foreach ($body as $key => $value) {
        if ($value === null) {
            continue;
        }

        if ($value instanceof CURLFile) {
            $prepared[$key] = $value;
            continue;
        }

        if (is_array($value)) {
            $prepared[$key] = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            continue;
        }

        if (is_bool($value)) {
            $prepared[$key] = $value ? 'true' : 'false';
            continue;
        }

        $prepared[$key] = (string) $value;
    }

    return $prepared;
}

function telegram_request(string $method, array $body = [], int $timeoutSeconds = 30): mixed
{
    $token = telegram_env('TELEGRAM_BOT_TOKEN');

    if ($token === null) {
        throw new RuntimeException('Falta TELEGRAM_BOT_TOKEN en el entorno del servidor.');
    }

    $url = 'https://api.telegram.org/bot' . $token . '/' . $method;
    $isMultipart = telegram_value_contains_file($body);
    $payload = telegram_prepare_request_body($body, $isMultipart);

    if (function_exists('curl_init')) {
        $handle = curl_init($url);

        if ($handle === false) {
            throw new RuntimeException('No se pudo iniciar la conexion con Telegram.');
        }

        $curlOptions = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
            CURLOPT_TIMEOUT => $timeoutSeconds,
        ];

        if (!$isMultipart) {
            $curlOptions[CURLOPT_HTTPHEADER] = ['Content-Type: application/json'];
        }

        curl_setopt_array($handle, $curlOptions);

        $responseBody = curl_exec($handle);
        $curlError = curl_error($handle);
        $statusCode = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle);

        if (!is_string($responseBody)) {
            throw new RuntimeException($curlError !== '' ? $curlError : 'No se obtuvo respuesta de Telegram.');
        }
    } else {
        if ($isMultipart) {
            throw new RuntimeException('No se pueden subir archivos a Telegram sin cURL.');
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => $timeoutSeconds,
            ],
        ]);

        $responseBody = file_get_contents($url, false, $context);

        if (!is_string($responseBody)) {
            throw new RuntimeException('No se obtuvo respuesta de Telegram.');
        }

        $statusCode = 200;
    }

    $decoded = json_decode($responseBody, true);

    if (!is_array($decoded)) {
        throw new RuntimeException('Telegram devolvio una respuesta invalida.');
    }

    if (($decoded['ok'] ?? false) !== true) {
        throw new RuntimeException(
            'Telegram API error in ' . $method . ': ' . json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
    }

    if ($statusCode >= 400) {
        throw new RuntimeException('Telegram devolvio un error HTTP ' . $statusCode . '.');
    }

    return $decoded['result'] ?? null;
}

function telegram_send_message(mixed $chatId, string $text, array $extra = [], int $timeoutSeconds = 30): mixed
{
    return telegram_request('sendMessage', array_merge([
        'chat_id' => $chatId,
        'text' => $text,
    ], $extra), $timeoutSeconds);
}

function telegram_text_length(string $text): int
{
    return function_exists('mb_strlen') ? mb_strlen($text, 'UTF-8') : strlen($text);
}

function telegram_text_slice(string $text, int $start, ?int $length = null): string
{
    if (function_exists('mb_substr')) {
        return $length === null
            ? mb_substr($text, $start, null, 'UTF-8')
            : mb_substr($text, $start, $length, 'UTF-8');
    }

    return $length === null ? substr($text, $start) : substr($text, $start, $length);
}

function telegram_text_last_position(string $text, string $needle): int|false
{
    if (function_exists('mb_strrpos')) {
        return mb_strrpos($text, $needle, 0, 'UTF-8');
    }

    return strrpos($text, $needle);
}

function telegram_find_message_split_position(string $text, int $maxLength): int
{
    $slice = telegram_text_slice($text, 0, $maxLength);
    $breakpoints = [
        "\n\n",
        "\n",
        '. ',
        '! ',
        '? ',
        '; ',
        ', ',
        ' ',
    ];

    foreach ($breakpoints as $breakpoint) {
        $position = telegram_text_last_position($slice, $breakpoint);

        if ($position !== false && $position >= (int) floor($maxLength * 0.6)) {
            return $position + telegram_text_length($breakpoint);
        }
    }

    return $maxLength;
}

function telegram_split_long_message(string $text, int $maxLength = 3900): array
{
    $normalized = trim(str_replace("\r", '', $text));

    if ($normalized === '') {
        return [];
    }

    if (telegram_text_length($normalized) <= $maxLength) {
        return [$normalized];
    }

    $chunks = [];
    $remaining = $normalized;

    while (telegram_text_length($remaining) > $maxLength) {
        $splitPosition = telegram_find_message_split_position($remaining, $maxLength);
        $chunks[] = trim(telegram_text_slice($remaining, 0, $splitPosition));
        $remaining = trim(telegram_text_slice($remaining, $splitPosition));
    }

    if ($remaining !== '') {
        $chunks[] = $remaining;
    }

    return $chunks;
}

function telegram_send_long_message(mixed $chatId, string $text, array $extra = []): array
{
    $chunks = telegram_split_long_message($text);
    $responses = [];

    foreach ($chunks as $index => $chunk) {
        $messageExtra = $extra;

        if ($index > 0) {
            unset($messageExtra['reply_to_message_id']);
        }

        $responses[] = telegram_send_message($chatId, $chunk, $messageExtra);
    }

    return $responses;
}

function telegram_send_photo(mixed $chatId, mixed $photo, string $caption, array $extra = []): mixed
{
    return telegram_request('sendPhoto', array_merge([
        'chat_id' => $chatId,
        'photo' => $photo,
        'caption' => $caption,
    ], $extra));
}

function telegram_message_id(mixed $message): ?int
{
    if (!is_array($message)) {
        return null;
    }

    $messageId = (int) ($message['message_id'] ?? 0);

    return $messageId > 0 ? $messageId : null;
}

function telegram_send_channel_text_post(array $payload, array $replyMarkup = []): mixed
{
    $imageUrl = trim((string) ($payload['imageUrl'] ?? $payload['photoUrl'] ?? ''));
    $imageStyle = trim((string) ($payload['imageStyle'] ?? ''));
    $previewUrl = null;

    if ($imageUrl !== '') {
        $processedInput = telegram_prepare_photo_input($imageUrl, $imageStyle);

        if ($processedInput instanceof CURLFile && method_exists($processedInput, 'getFilename')) {
            $previewUrl = telegram_public_media_url_from_path($processedInput->getFilename());
        } elseif (is_string($processedInput) && $processedInput !== '') {
            $previewUrl = $processedInput;
        } elseif ($imageStyle !== 'cendra_crop_top') {
            $previewUrl = $imageUrl;
        }
    }

    $bodyText = telegram_build_channel_publication_text($payload, 3400);
    $html = '';

    if ($previewUrl !== null) {
        $html .= '<a href="' . telegram_escape_html($previewUrl) . '">&#8203;</a>';
    }

    $html .= telegram_escape_html($bodyText);

    $linkPreviewOptions = [
        'is_disabled' => $previewUrl === null,
        'prefer_large_media' => true,
        'show_above_text' => true,
    ];

    if ($previewUrl !== null) {
        $linkPreviewOptions['url'] = $previewUrl;
    }

    return telegram_request('sendMessage', array_merge([
        'chat_id' => telegram_channel_id(),
        'text' => $html,
        'parse_mode' => 'HTML',
        'link_preview_options' => $linkPreviewOptions,
    ], $replyMarkup));
}

function telegram_send_channel_photo_post(array $payload, string|CURLFile $photoInput, array $replyMarkup = []): array
{
    $bodyText = telegram_build_channel_publication_text($payload, 3400);
    $chunks = telegram_split_long_message($bodyText, 1024);

    if ($chunks === []) {
        $title = trim((string) ($payload['title'] ?? ''));
        $chunks = [$title !== '' ? $title : 'Actualizacion Falles360'];
    }

    $photoResponse = telegram_send_photo(
        telegram_channel_id(),
        $photoInput,
        $chunks[0],
        $replyMarkup
    );

    $photoMessageId = telegram_message_id($photoResponse);
    $messageResponses = [];

    foreach (array_slice($chunks, 1) as $index => $chunk) {
        $extra = [];

        if ($index === 0 && $photoMessageId !== null) {
            $extra['reply_to_message_id'] = $photoMessageId;
        }

        $messageResponses[] = telegram_send_message(
            telegram_channel_id(),
            $chunk,
            $extra
        );
    }

    return [
        'photo' => $photoResponse,
        'messages' => $messageResponses,
    ];
}

function telegram_send_channel_post(array $payload): mixed
{
    $imageUrl = trim((string) ($payload['imageUrl'] ?? $payload['photoUrl'] ?? ''));
    $imageStyle = trim((string) ($payload['imageStyle'] ?? ''));
    $originalUrl = trim((string) ($payload['buttonUrl'] ?? ''));
    $replyMarkup = telegram_build_reply_markup(
        isset($payload['buttonText']) ? (string) $payload['buttonText'] : null,
        $originalUrl !== '' ? $originalUrl : null
    );

    if ($imageUrl !== '') {
        $photoInput = telegram_prepare_photo_input($imageUrl, $imageStyle);

        if ($photoInput !== null) {
            try {
                return telegram_send_channel_photo_post($payload, $photoInput, $replyMarkup);
            } catch (Throwable $exception) {
                error_log('Telegram channel photo post fallback: ' . $exception->getMessage());
            }
        }

        try {
            return telegram_send_channel_text_post($payload, $replyMarkup);
        } catch (Throwable $exception) {
            error_log('Telegram channel text post fallback: ' . $exception->getMessage());
        }
    }

    return telegram_send_channel_text_post($payload, $replyMarkup);
}

function telegram_send_direct_alert(mixed $chatId, array $payload): mixed
{
    $footer = trim((string) ($payload['footer'] ?? ''));
    $text = telegram_build_direct_alert_message(array_merge($payload, [
        'footer' => $footer !== '' ? $footer : 'Consulta mas detalles en la app.',
    ]));

    return telegram_send_message($chatId, $text);
}

function telegram_error_log_path(): string
{
    return dirname(__DIR__) . '/logs/telegram_errors.log';
}

function telegram_log_error_message(string $message): void
{
    $directory = dirname(telegram_error_log_path());

    if (!is_dir($directory) && !@mkdir($directory, 0775, true) && !is_dir($directory)) {
        error_log('Telegram log directory unavailable: ' . $message);
        return;
    }

    $line = sprintf("[%s] Telegram error: %s\n", date('Y-m-d H:i:s'), trim($message));
    @file_put_contents(telegram_error_log_path(), $line, FILE_APPEND | LOCK_EX);
    error_log('Telegram error: ' . trim($message));
}

function telegram_registration_notification_admin_chat_ids(): array
{
    $chatIds = [];
    $configuredAdminChatId = telegram_env('TELEGRAM_ADMIN_CHAT_ID');

    if ($configuredAdminChatId !== null) {
        $chatIds[$configuredAdminChatId] = $configuredAdminChatId;
    }

    try {
        $statement = db()->prepare(
            "SELECT id
             FROM users
             WHERE role IN ('admin', 'support')
               AND status = :status"
        );
        $statement->execute(['status' => 'active']);

        foreach ($statement->fetchAll() ?: [] as $row) {
            $userId = (int) ($row['id'] ?? 0);

            if ($userId <= 0) {
                continue;
            }

            $linkedUser = telegram_get_linked_user($userId);
            $chatId = trim((string) ($linkedUser['chatId'] ?? ''));

            if ($chatId === '') {
                continue;
            }

            $chatIds[$chatId] = $chatId;
        }
    } catch (Throwable $exception) {
        if ($chatIds === []) {
            telegram_log_error_message('No se pudieron resolver los admins vinculados a Telegram: ' . $exception->getMessage());
        }
    }

    return array_values($chatIds);
}

function telegram_registration_client_ip(): string
{
    $remoteAddr = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));

    if ($remoteAddr === '') {
        return 'IP no disponible';
    }

    $isTrustedProxyHop = in_array($remoteAddr, ['127.0.0.1', '::1'], true)
        || filter_var($remoteAddr, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;

    if ($isTrustedProxyHop) {
        $cloudflareIp = trim((string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? ''));

        if ($cloudflareIp !== '' && filter_var($cloudflareIp, FILTER_VALIDATE_IP) !== false) {
            return $cloudflareIp;
        }

        $forwardedFor = trim((string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));

        if ($forwardedFor !== '') {
            foreach (explode(',', $forwardedFor) as $candidate) {
                $candidate = trim($candidate);

                if ($candidate !== '' && filter_var($candidate, FILTER_VALIDATE_IP) !== false) {
                    return $candidate;
                }
            }
        }
    }

    return $remoteAddr;
}

function telegram_build_new_registration_message(array $user): string
{
    $name = trim((string) ($user['name'] ?? $user['username'] ?? 'Sin nombre'));
    $email = trim((string) ($user['email'] ?? 'Sin email'));
    $userId = trim((string) ($user['id'] ?? '0'));
    $createdAt = trim((string) ($user['created_at'] ?? date('Y-m-d H:i:s')));
    $ipAddress = telegram_registration_client_ip();

    return implode("\n", [
        '🧡 <b>Nuevo registro en Fallas 360</b>',
        '',
        '👤 <b>Nombre:</b> ' . telegram_escape_html($name),
        '📧 <b>Email:</b> ' . telegram_escape_html($email),
        '🆔 <b>ID usuario:</b> ' . telegram_escape_html($userId),
        '🕒 <b>Fecha:</b> ' . telegram_escape_html($createdAt),
        '📍 <b>IP:</b> ' . telegram_escape_html($ipAddress),
        '',
        'Revisa el panel de administración para ver más detalles.',
    ]);
}

function telegram_build_new_guest_access_message(array $guest): string
{
    $name = trim((string) ($guest['name'] ?? 'Invitado'));
    $accessAt = trim((string) ($guest['access_at'] ?? date('Y-m-d H:i:s')));
    $sessionId = trim((string) ($guest['session_id'] ?? ''));
    $ipAddress = telegram_registration_client_ip();
    $userAgent = trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? 'Navegador no disponible'));

    return implode("\n", array_filter([
        '👀 <b>Nuevo invitado en Fallas 360</b>',
        '',
        '👤 <b>Perfil:</b> ' . telegram_escape_html($name),
        $sessionId !== '' ? '🔐 <b>Sesión:</b> ' . telegram_escape_html(substr($sessionId, 0, 12)) : null,
        '🕒 <b>Fecha:</b> ' . telegram_escape_html($accessAt),
        '📍 <b>IP:</b> ' . telegram_escape_html($ipAddress),
        '🌐 <b>Navegador:</b> ' . telegram_escape_html(telegram_truncate_plain_text($userAgent, 180)),
        '',
        'Ha entrado en modo invitado.',
    ], static fn (?string $line): bool => $line !== null));
}

function telegram_notify_new_user_registration(array $user): bool
{
    if (!telegram_is_configured()) {
        telegram_log_error_message('No se puede notificar el nuevo registro: falta TELEGRAM_BOT_TOKEN.');
        return false;
    }

    $chatIds = telegram_registration_notification_admin_chat_ids();

    if ($chatIds === []) {
        telegram_log_error_message('No hay chat privado configurado ni admins/support vinculados para recibir altas.');
        return false;
    }

    $message = telegram_build_new_registration_message($user);
    $deliveredCount = 0;

    foreach ($chatIds as $chatId) {
        try {
            telegram_send_message($chatId, $message, [
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ], 5);
            $deliveredCount++;
        } catch (Throwable $exception) {
            telegram_log_error_message(
                'No se pudo enviar la notificacion de nuevo registro al chat ' . $chatId . ': ' . $exception->getMessage()
            );
        }
    }

    return $deliveredCount > 0;
}

function telegram_notify_new_guest_access(array $guest): bool
{
    if (!telegram_is_configured()) {
        telegram_log_error_message('No se puede notificar el acceso invitado: falta TELEGRAM_BOT_TOKEN.');
        return false;
    }

    $chatIds = telegram_registration_notification_admin_chat_ids();

    if ($chatIds === []) {
        telegram_log_error_message('No hay chat privado configurado ni admins/support vinculados para recibir accesos invitados.');
        return false;
    }

    $message = telegram_build_new_guest_access_message($guest);
    $deliveredCount = 0;

    foreach ($chatIds as $chatId) {
        try {
            telegram_send_message($chatId, $message, [
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ], 5);
            $deliveredCount++;
        } catch (Throwable $exception) {
            telegram_log_error_message(
                'No se pudo enviar la notificacion de acceso invitado al chat ' . $chatId . ': ' . $exception->getMessage()
            );
        }
    }

    return $deliveredCount > 0;
}

function telegram_answer_callback_query(string $callbackQueryId, string $text, bool $showAlert = false): mixed
{
    return telegram_request('answerCallbackQuery', [
        'callback_query_id' => $callbackQueryId,
        'text' => $text,
        'show_alert' => $showAlert,
    ]);
}

function telegram_edit_message_reply_markup(mixed $chatId, int $messageId, array $rows = []): mixed
{
    return telegram_request('editMessageReplyMarkup', [
        'chat_id' => $chatId,
        'message_id' => $messageId,
        'reply_markup' => [
            'inline_keyboard' => $rows,
        ],
    ]);
}

function telegram_send_channel_review_request(mixed $chatId, array $payload, array $meta = []): mixed
{
    $token = telegram_create_pending_publication($chatId, $payload, $meta);
    $keyboard = [
        [
            [
                'text' => 'Confirmar en canal',
                'callback_data' => 'publish:' . $token,
            ],
        ],
        [
            [
                'text' => 'Descartar borrador',
                'callback_data' => 'discard:' . $token,
            ],
        ],
    ];

    if (trim((string) ($payload['buttonUrl'] ?? '')) !== '') {
        $keyboard[] = [
            [
                'text' => trim((string) ($payload['buttonText'] ?? 'Abrir fuente')),
                'url' => trim((string) ($payload['buttonUrl'] ?? '')),
            ],
        ];
    }

    return telegram_send_message(
        $chatId,
        telegram_build_channel_review_text($payload, $meta),
        telegram_build_inline_keyboard_markup($keyboard)
    );
}

function telegram_send_cendra_article_to_chat(mixed $chatId, array $article, array $meta = []): mixed
{
    $message = telegram_send_message(
        $chatId,
        cendra_article_direct_telegram_text($article),
        telegram_build_reply_markup('Leer articulo', (string) ($article['url'] ?? ''))
    );

    telegram_send_channel_review_request($chatId, cendra_article_telegram_payload($article), $meta);

    return $message;
}

function telegram_send_cendra_summary_review_to_chat(mixed $chatId, array $summary, array $meta = []): mixed
{
    return telegram_send_channel_review_request($chatId, $summary, $meta);
}

function telegram_send_cendra_channel_post(array $article): mixed
{
    $payload = cendra_article_telegram_payload($article);

    return telegram_send_channel_post($payload);
}

function telegram_send_channel_invite(mixed $chatId): mixed
{
    $channelUrl = telegram_env('TELEGRAM_CHANNEL_URL');
    $channelName = telegram_env('TELEGRAM_CHANNEL_NAME', 'Falles360') ?? 'Falles360';

    return telegram_send_message(
        $chatId,
        "🎉 Telegram ya está conectado con tu cuenta.\n\n"
        . "Accede al canal oficial {$channelName} para enterarte de avisos, noticias y novedades generales de la app de Fallas.",
        [
            'reply_markup' => [
                'inline_keyboard' => [
                    [
                        [
                            'text' => "📲 Entrar en {$channelName}",
                            'url' => $channelUrl,
                        ],
                    ],
                ],
            ],
        ]
    );
}

function telegram_set_bot_commands(): mixed
{
    return telegram_request('setMyCommands', [
        'commands' => [
            ['command' => 'start', 'description' => 'Iniciar el bot'],
            ['command' => 'hoy', 'description' => 'Ver agenda fallera de hoy'],
            ['command' => 'mapa', 'description' => 'Abrir mapa de la app'],
            ['command' => 'favoritas', 'description' => 'Gestionar fallas favoritas'],
            ['command' => 'cendra', 'description' => 'Buscar noticias de Cendra'],
            ['command' => 'canal', 'description' => 'Preparar borrador para el canal'],
        ],
    ]);
}

function telegram_try_sync_bot_configuration(): void
{
    if (!telegram_is_configured()) {
        return;
    }

    try {
        telegram_set_bot_commands();
    } catch (Throwable $exception) {
        error_log('Telegram commands sync failed: ' . $exception->getMessage());
    }

    $webhookUrl = telegram_webhook_url();

    if ($webhookUrl === null) {
        return;
    }

    try {
        $payload = [
            'url' => $webhookUrl,
        ];
        $secret = telegram_webhook_secret();

        if ($secret !== null) {
            $payload['secret_token'] = $secret;
        }

        telegram_request('setWebhook', $payload);
    } catch (Throwable $exception) {
        error_log('Telegram webhook sync failed: ' . $exception->getMessage());
    }
}

function telegram_drain_updates(bool $suppressErrors = true): array
{
    if (!telegram_is_configured()) {
        return [
            'processed' => 0,
            'nextOffset' => null,
        ];
    }

    try {
        $state = telegram_read_store();
        $offset = isset($state['lastUpdateId']) ? (int) $state['lastUpdateId'] : 0;
        $updates = telegram_request('getUpdates', [
            'timeout' => 0,
            'offset' => $offset,
        ]);

        if (!is_array($updates) || $updates === []) {
            return [
                'processed' => 0,
                'nextOffset' => $offset,
            ];
        }

        $nextOffset = $offset;
        $processed = 0;

        foreach ($updates as $update) {
            if (!is_array($update)) {
                continue;
            }

            telegram_handle_update($update);
            $processed++;

            $updateId = isset($update['update_id']) ? (int) $update['update_id'] : 0;

            if ($updateId > 0) {
                $nextOffset = max($nextOffset, $updateId + 1);
            }
        }

        if ($nextOffset !== $offset) {
            $latestState = telegram_read_store();
            $latestState['lastUpdateId'] = $nextOffset;
            telegram_write_store($latestState);
        }

        return [
            'processed' => $processed,
            'nextOffset' => $nextOffset,
        ];
    } catch (Throwable $exception) {
        if (!$suppressErrors) {
            throw $exception;
        }

        error_log('Telegram polling via PHP failed: ' . $exception->getMessage());

        return [
            'processed' => 0,
            'nextOffset' => null,
        ];
    }
}

function telegram_extract_command(string $text): array
{
    $normalizedText = trim($text);

    if ($normalizedText === '' || $normalizedText[0] !== '/') {
        return [
            'command' => '',
            'param' => '',
        ];
    }

    $parts = preg_split('/\s+/', $normalizedText) ?: [];
    $rawCommand = $parts[0] ?? '';
    $commandParts = explode('@', $rawCommand);

    return [
        'command' => $commandParts[0] ?? '',
        'param' => trim(implode(' ', array_slice($parts, 1))),
    ];
}

function telegram_handle_callback_query(array $callbackQuery): void
{
    $callbackQueryId = trim((string) ($callbackQuery['id'] ?? ''));
    $data = trim((string) ($callbackQuery['data'] ?? ''));
    $message = isset($callbackQuery['message']) && is_array($callbackQuery['message']) ? $callbackQuery['message'] : [];
    $chatId = $message['chat']['id'] ?? null;
    $messageId = isset($message['message_id']) ? (int) $message['message_id'] : 0;

    if ($callbackQueryId === '' || $data === '' || $chatId === null) {
        return;
    }

    if (str_starts_with($data, 'discard:')) {
        $token = substr($data, strlen('discard:'));
        $pending = telegram_get_pending_publication($token, $chatId);

        if (!is_array($pending)) {
            telegram_answer_callback_query($callbackQueryId, 'Ese borrador ya no esta disponible.', true);
            return;
        }

        telegram_remove_pending_publication($token);
        telegram_answer_callback_query($callbackQueryId, 'Borrador descartado.');

        if ($messageId > 0) {
            telegram_edit_message_reply_markup($chatId, $messageId);
        }

        telegram_send_message($chatId, '🗑️ El borrador se ha descartado y no se publicara en el canal.');
        return;
    }

    if (!str_starts_with($data, 'publish:')) {
        telegram_answer_callback_query($callbackQueryId, 'Accion no reconocida.', true);
        return;
    }

    $token = substr($data, strlen('publish:'));
    $pending = telegram_get_pending_publication($token, $chatId);

    if (!is_array($pending)) {
        telegram_answer_callback_query($callbackQueryId, 'Ese borrador ya no esta disponible.', true);
        return;
    }

    if (!telegram_is_channel_editor_chat($chatId)) {
        telegram_answer_callback_query($callbackQueryId, 'Tu cuenta ya no puede publicar en el canal.', true);
        return;
    }

    try {
        telegram_send_channel_post($pending['payload']);
        telegram_finalize_pending_publication($pending);
        telegram_remove_pending_publication($token);
        telegram_answer_callback_query($callbackQueryId, 'Publicado en el canal.');

        if ($messageId > 0) {
            telegram_edit_message_reply_markup($chatId, $messageId);
        }

        telegram_send_message($chatId, '✅ El borrador ya se ha publicado en el canal de Falles360.');
    } catch (Throwable $exception) {
        telegram_answer_callback_query($callbackQueryId, 'No se pudo publicar ahora mismo.', true);
        telegram_send_message($chatId, 'No pude publicar el borrador en el canal: ' . $exception->getMessage());
    }
}

function telegram_handle_update(array $update): void
{
    if (isset($update['callback_query']) && is_array($update['callback_query'])) {
        telegram_handle_callback_query($update['callback_query']);
        return;
    }

    if (!isset($update['message']) || !is_array($update['message'])) {
        return;
    }

    $message = $update['message'];
    $chatId = $message['chat']['id'] ?? null;
    $text = isset($message['text']) ? (string) $message['text'] : '';
    $username = isset($message['from']['username']) ? (string) $message['from']['username'] : '';
    $commandData = telegram_extract_command($text);
    $command = $commandData['command'];
    $param = $commandData['param'];

    if ($chatId === null || $command === '') {
        return;
    }

    if ($command === '/start') {
        if ($param !== '' && str_starts_with($param, 'link_')) {
            $linkToken = substr($param, strlen('link_'));
            $userId = telegram_consume_pending_link($linkToken);

            if ($userId === null) {
                telegram_send_message($chatId, 'Ese enlace de vinculacion ya no es valido.');
                return;
            }

            telegram_set_linked_user($userId, $chatId, $username);
            telegram_send_message(
                $chatId,
                "✅ Tu cuenta de Telegram se ha vinculado correctamente con Falles App.\n\nYa puedes recibir avisos, novedades y notificaciones importantes."
            );
            telegram_send_channel_invite($chatId);

            return;
        }

        telegram_send_message(
            $chatId,
            "Bienvenido al bot de la app de Fallas.\n\nUsa /hoy para ver la agenda o vincula tu cuenta desde la app."
        );
        return;
    }

    if ($command === '/hoy') {
        telegram_send_message($chatId, "Agenda de hoy:\n- Mascleta 14:00\n- Ofrenda 17:30\n- Castillo 23:59");
        return;
    }

    if ($command === '/mapa') {
        $baseUrl = telegram_public_base_url() ?? 'http://localhost:3000';
        telegram_send_message($chatId, 'Abre el mapa aqui: ' . rtrim($baseUrl, '/') . '/mapa');
        return;
    }

    if ($command === '/favoritas') {
        telegram_send_message($chatId, 'Gestiona tus fallas favoritas desde la app.');
        return;
    }

    if ($command === '/canal') {
        if (!telegram_is_channel_editor_chat($chatId)) {
            telegram_send_message(
                $chatId,
                'Solo las cuentas admin vinculadas pueden preparar borradores para el canal.'
            );
            return;
        }

        $normalizedParam = mb_strtolower(trim($param), 'UTF-8');

        try {
            if ($normalizedParam === '' || $normalizedParam === 'hoy' || $normalizedParam === 'resumen') {
                $summary = cendra_daily_summary_payload();
                telegram_send_cendra_summary_review_to_chat($chatId, $summary, [
                    'action' => 'cendra_daily_summary_publish_approved',
                    'query' => $normalizedParam !== '' ? $param : 'resumen diario',
                    'articleIds' => array_values(array_filter(array_map(
                        static fn (array $article): int => (int) ($article['id'] ?? 0),
                        is_array($summary['articles'] ?? null) ? $summary['articles'] : []
                    ))),
                ]);
                return;
            }

            $articles = cendra_search_articles($param, 5);

            if ($articles === []) {
                telegram_send_message($chatId, 'No he encontrado resultados para preparar ese borrador de canal.');
                return;
            }

            $draft = cendra_query_summary_payload($articles, $param, 4);
            telegram_send_cendra_summary_review_to_chat($chatId, $draft, [
                'action' => 'cendra_query_summary_publish_approved',
                'query' => $param,
                'articleIds' => array_values(array_filter(array_map(
                    static fn (array $article): int => (int) ($article['id'] ?? 0),
                    is_array($draft['articles'] ?? null) ? $draft['articles'] : []
                ))),
            ]);
        } catch (Throwable $exception) {
            telegram_send_message($chatId, 'No pude preparar el borrador de canal ahora mismo.');
        }

        return;
    }

    if ($command === '/cendra') {
        $normalizedParam = mb_strtolower(trim($param), 'UTF-8');

        if ($normalizedParam === 'hoy' || $normalizedParam === 'resumen') {
            try {
                $summary = cendra_daily_summary_payload();
                telegram_send_message($chatId, cendra_daily_summary_telegram_text($summary));
            } catch (Throwable $exception) {
                telegram_send_message($chatId, 'No pude preparar el resumen diario de Cendra ahora mismo.');
            }

            return;
        }

        $articles = cendra_search_articles($param !== '' ? $param : null, 5);

        if ($articles === []) {
            telegram_send_message(
                $chatId,
                $param !== ''
                    ? 'No he encontrado resultados de Cendra para esa busqueda.'
                    : 'Todavia no hay articulos de Cendra cargados en la app.'
            );
            return;
        }

        telegram_send_message($chatId, cendra_search_results_telegram_text($articles, $param !== '' ? $param : null));
    }
}

function telegram_registered_user_id(array $user): ?string
{
    if (($user['type'] ?? '') !== 'user') {
        return null;
    }

    $userId = isset($user['id']) ? (int) $user['id'] : 0;

    return $userId > 0 ? (string) $userId : null;
}
