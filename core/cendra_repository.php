<?php
declare(strict_types=1);

function cendra_source_url(): string
{
    return trim((string) (getenv('CENDRA_SYNC_SOURCE_URL') ?: 'https://www.cendradigital.com/category/actualidad/'));
}

function cendra_sync_timeout_seconds(): int
{
    return max(5, min(60, (int) (getenv('CENDRA_SYNC_TIMEOUT') ?: 15)));
}

function cendra_sync_feed_limit(): int
{
    return max(1, min(40, (int) (getenv('CENDRA_SYNC_LIMIT') ?: 12)));
}

function cendra_articles_count(): int
{
    $row = db()->query('SELECT COUNT(*) AS total FROM cendra_articles')->fetch();

    return (int) ($row['total'] ?? 0);
}

function cendra_landing_columns_ensure(): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $existing = [];
    foreach (db()->query('SHOW COLUMNS FROM cendra_articles')->fetchAll() ?: [] as $column) {
        $existing[(string) ($column['Field'] ?? '')] = true;
    }

    $alters = [
        'landing_published' => "ALTER TABLE cendra_articles ADD COLUMN landing_published TINYINT(1) NOT NULL DEFAULT 0 AFTER telegram_sent",
        'landing_published_at' => "ALTER TABLE cendra_articles ADD COLUMN landing_published_at DATETIME NULL AFTER landing_published",
        'landing_title' => "ALTER TABLE cendra_articles ADD COLUMN landing_title VARCHAR(255) DEFAULT '' AFTER landing_published_at",
        'landing_excerpt' => "ALTER TABLE cendra_articles ADD COLUMN landing_excerpt TEXT NULL AFTER landing_title",
        'landing_featured' => "ALTER TABLE cendra_articles ADD COLUMN landing_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER landing_excerpt",
    ];

    foreach ($alters as $column => $sql) {
        if (!isset($existing[$column])) {
            db()->exec($sql);
        }
    }

    $ensured = true;
}

function cendra_landing_articles_count(): int
{
    cendra_landing_columns_ensure();
    $row = db()->query(
        'SELECT COUNT(*) AS total
         FROM cendra_articles
         WHERE landing_published = 1'
    )->fetch();

    return (int) ($row['total'] ?? 0);
}

function cendra_pending_telegram_articles_count(): int
{
    $row = db()->query(
        'SELECT COUNT(*) AS total
         FROM cendra_articles
         WHERE COALESCE(telegram_sent, 0) = 0'
    )->fetch();

    return (int) ($row['total'] ?? 0);
}

function cendra_latest_article_published_at(): ?string
{
    $row = db()->query(
        'SELECT published_at
         FROM cendra_articles
         WHERE published_at IS NOT NULL
         ORDER BY published_at DESC, id DESC
         LIMIT 1'
    )->fetch();

    $value = trim((string) ($row['published_at'] ?? ''));

    return $value !== '' ? $value : null;
}

function cendra_recent_articles(int $limit = 5): array
{
    cendra_landing_columns_ensure();
    $limit = max(1, min(20, $limit));
    $statement = db()->prepare(
        'SELECT id, title, slug, url, published_at, summary, category, author, telegram_sent,
                landing_published, landing_published_at, landing_title, landing_excerpt, landing_featured
         FROM cendra_articles
         ORDER BY COALESCE(published_at, created_at) DESC, id DESC
         LIMIT :limit'
    );
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->execute();

    return $statement->fetchAll() ?: [];
}

function cendra_find_article(int $articleId): ?array
{
    cendra_landing_columns_ensure();
    $statement = db()->prepare(
        'SELECT id, title, slug, url, published_at, summary, content, category, author, parsed_json, telegram_sent,
                landing_published, landing_published_at, landing_title, landing_excerpt, landing_featured
         FROM cendra_articles
         WHERE id = :id
         LIMIT 1'
    );
    $statement->execute(['id' => $articleId]);
    $row = $statement->fetch();

    return is_array($row) ? $row : null;
}

function cendra_search_articles(?string $query = null, int $limit = 12): array
{
    cendra_landing_columns_ensure();
    $limit = max(1, min(50, $limit));
    $normalizedQuery = trim((string) ($query ?? ''));

    if ($normalizedQuery === '') {
        $statement = db()->prepare(
            'SELECT id, title, slug, url, published_at, summary, category, author, telegram_sent,
                    landing_published, landing_published_at, landing_title, landing_excerpt, landing_featured
             FROM cendra_articles
             ORDER BY COALESCE(published_at, created_at) DESC, id DESC
             LIMIT :limit'
        );
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll() ?: [];
    }

    $searchTerm = '%' . $normalizedQuery . '%';
    $statement = db()->prepare(
        'SELECT id, title, slug, url, published_at, summary, category, author, telegram_sent,
                landing_published, landing_published_at, landing_title, landing_excerpt, landing_featured
         FROM cendra_articles
         WHERE title LIKE :search
            OR summary LIKE :search
            OR content LIKE :search
            OR category LIKE :search
            OR author LIKE :search
            OR url LIKE :search
         ORDER BY COALESCE(published_at, created_at) DESC, id DESC
         LIMIT :limit'
    );
    $statement->bindValue(':search', $searchTerm);
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->execute();

    return $statement->fetchAll() ?: [];
}

function cendra_pending_review_articles(int $limit = 5): array
{
    cendra_landing_columns_ensure();
    $limit = max(1, min(20, $limit));
    $statement = db()->prepare(
        'SELECT id, title, slug, url, published_at, summary, content, category, author, telegram_sent,
                landing_published, landing_published_at, landing_title, landing_excerpt, landing_featured
         FROM cendra_articles
         WHERE COALESCE(telegram_sent, 0) = 0
         ORDER BY COALESCE(published_at, created_at) DESC, id DESC
         LIMIT :limit'
    );
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->execute();

    return $statement->fetchAll() ?: [];
}

function cendra_mark_article_telegram_sent(int $articleId): void
{
    $statement = db()->prepare(
        'UPDATE cendra_articles
         SET telegram_sent = 1
         WHERE id = :id'
    );
    $statement->execute(['id' => $articleId]);
}

function cendra_mark_articles_telegram_sent(array $articleIds): void
{
    $normalizedIds = array_values(array_unique(array_filter(
        array_map(static fn (mixed $value): int => (int) $value, $articleIds),
        static fn (int $value): bool => $value > 0
    )));

    if ($normalizedIds === []) {
        return;
    }

    $placeholders = implode(', ', array_fill(0, count($normalizedIds), '?'));
    $statement = db()->prepare(
        "UPDATE cendra_articles
         SET telegram_sent = 1
         WHERE id IN ({$placeholders})"
    );
    $statement->execute($normalizedIds);
}

function cendra_set_article_landing_publication(int $articleId, bool $published): void
{
    cendra_landing_columns_ensure();
    $statement = db()->prepare(
        'UPDATE cendra_articles
         SET landing_published = :published,
             landing_published_at = CASE WHEN :published_at = 1 THEN COALESCE(landing_published_at, CURRENT_TIMESTAMP) ELSE NULL END,
             landing_title = CASE WHEN :published_title = 1 THEN COALESCE(NULLIF(landing_title, ""), title) ELSE landing_title END,
             landing_excerpt = CASE WHEN :published_excerpt = 1 THEN COALESCE(NULLIF(landing_excerpt, ""), summary) ELSE landing_excerpt END
         WHERE id = :id'
    );
    $statement->execute([
        'published' => $published ? 1 : 0,
        'published_at' => $published ? 1 : 0,
        'published_title' => $published ? 1 : 0,
        'published_excerpt' => $published ? 1 : 0,
        'id' => $articleId,
    ]);
}

function cendra_landing_articles(int $limit = 6): array
{
    cendra_landing_columns_ensure();
    $limit = max(1, min(12, $limit));
    $statement = db()->prepare(
        'SELECT id, title, slug, url, published_at, summary, content, category, author, parsed_json,
                landing_published, landing_published_at, landing_title, landing_excerpt, landing_featured
         FROM cendra_articles
         WHERE landing_published = 1
         ORDER BY landing_featured DESC, COALESCE(landing_published_at, published_at, created_at) DESC, id DESC
         LIMIT :limit'
    );
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->execute();

    return $statement->fetchAll() ?: [];
}

function cendra_articles_for_calendar_day(DateTimeInterface $date, int $limit = 6): array
{
    cendra_landing_columns_ensure();
    $limit = max(1, min(20, $limit));
    $statement = db()->prepare(
        'SELECT id, title, slug, url, published_at, summary, category, author, telegram_sent,
                landing_published, landing_published_at, landing_title, landing_excerpt, landing_featured
         FROM cendra_articles
         WHERE published_at IS NOT NULL
           AND DATE(published_at) = :day
         ORDER BY published_at DESC, id DESC
         LIMIT :limit'
    );
    $statement->bindValue(':day', $date->format('Y-m-d'));
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->execute();

    return $statement->fetchAll() ?: [];
}

function cendra_daily_summary_payload(?DateTimeInterface $date = null, int $limit = 5): array
{
    $requestedDate = $date ?? new DateTimeImmutable('now');
    $resolvedLimit = max(2, min(8, $limit));
    $articles = cendra_articles_for_calendar_day($requestedDate, $resolvedLimit);
    $summaryDate = $requestedDate;
    $mode = 'requested_day';

    if ($articles === []) {
        $latestPublishedAt = cendra_latest_article_published_at();

        if ($latestPublishedAt === null) {
            $articles = cendra_recent_articles($resolvedLimit);
            $mode = 'recent_fallback';
        } else {
            $summaryDate = new DateTimeImmutable($latestPublishedAt);
            $articles = cendra_articles_for_calendar_day($summaryDate, $resolvedLimit);
            $mode = 'latest_available_day';
        }
    }

    if ($articles === []) {
        $articles = cendra_recent_articles($resolvedLimit);
        $mode = 'recent_fallback';

        if ($articles !== []) {
            $fallbackDate = trim((string) ($articles[0]['published_at'] ?? ''));
            if ($fallbackDate !== '') {
                $summaryDate = new DateTimeImmutable($fallbackDate);
            }
        }
    }

    if ($articles === []) {
        throw new RuntimeException('No se pudo construir el resumen diario de Cendra.');
    }

    $summaryDateLabel = cendra_summary_date_label($summaryDate);
    $requestedDateLabel = cendra_summary_date_label($requestedDate);
    $lines = [];

    foreach ($articles as $article) {
        $lines[] = '• ' . cendra_article_summary_line($article);
    }

    $intro = match ($mode) {
        'requested_day' => "Estas son las claves de la jornada del {$summaryDateLabel}:",
        'latest_available_day' => "Hoy no hay nuevas piezas registradas para el {$requestedDateLabel}. Este borrador resume las claves publicadas el {$summaryDateLabel}:",
        default => 'Resumen de las ultimas publicaciones relevantes detectadas:',
    };

    $detail = $intro . "\n\n" . implode("\n", $lines) . "\n\nSeguiremos pendientes de nuevas actualizaciones para completar la cobertura del dia.";

    return [
        'type' => 'novedad',
        'target' => 'channel',
        'title' => 'Claves falleras del dia · ' . $summaryDateLabel,
        'detail' => cendra_truncate($detail, 3500),
        'location' => 'Valencia · seguimiento Falles360',
        'footer' => 'Sigue la cobertura, avisos y rutas desde Falles360.',
        'summary_date' => $summaryDate->format('Y-m-d'),
        'mode' => $mode,
        'article_count' => count($articles),
        'articles' => array_map(static function (array $article): array {
            return [
                'id' => (int) ($article['id'] ?? 0),
                'title' => (string) ($article['title'] ?? ''),
                'url' => (string) ($article['url'] ?? ''),
                'published_at' => $article['published_at'] ?? null,
            ];
        }, $articles),
    ];
}

function cendra_sync_status_snapshot(): array
{
    return [
        'configured' => cendra_source_url() !== '',
        'source_url' => cendra_source_url() !== '' ? cendra_source_url() : null,
        'articles_total' => cendra_articles_count(),
        'pending_telegram_articles' => cendra_pending_telegram_articles_count(),
        'landing_articles' => cendra_landing_articles_count(),
        'latest_article_published_at' => cendra_latest_article_published_at(),
        'latest_run' => cendra_sync_run_latest(),
        'recent_articles' => cendra_recent_articles(4),
    ];
}

function cendra_sync_articles(?string $sourceUrl = null, ?int $limit = null): array
{
    $resolvedSourceUrl = trim((string) ($sourceUrl ?? cendra_source_url()));
    $resolvedLimit = max(1, min(40, (int) ($limit ?? cendra_sync_feed_limit())));

    if ($resolvedSourceUrl === '') {
        throw new RuntimeException('Configura CENDRA_SYNC_SOURCE_URL para activar la sincronizacion.');
    }

    $runId = cendra_sync_run_start('running', 'Inicio de sincronizacion desde ' . $resolvedSourceUrl);

    try {
        $payload = cendra_http_get($resolvedSourceUrl, cendra_sync_timeout_seconds());
        $items = cendra_parse_source_payload($payload, $resolvedSourceUrl, $resolvedLimit);
        [$newItems, $updatedItems] = cendra_upsert_articles($items);

        $notes = sprintf(
            'Fuente: %s | procesados: %d | nuevos: %d | actualizados: %d',
            cendra_host_label($resolvedSourceUrl),
            count($items),
            $newItems,
            $updatedItems
        );

        cendra_sync_run_finish($runId, 'success', $newItems, $notes);

        return [
            'run_id' => $runId,
            'source_url' => $resolvedSourceUrl,
            'processed_items' => count($items),
            'new_items' => $newItems,
            'updated_items' => $updatedItems,
            'latest_run' => cendra_sync_run_latest(),
        ];
    } catch (Throwable $exception) {
        cendra_sync_run_mark_failed($runId, cendra_error_message($exception));
        throw $exception;
    }
}

function cendra_http_get(string $url, int $timeoutSeconds): string
{
    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        throw new InvalidArgumentException('La URL de Cendra no es valida.');
    }

    if (function_exists('curl_init')) {
        $handle = curl_init($url);

        if ($handle === false) {
            throw new RuntimeException('No se pudo inicializar cURL para Cendra.');
        }

        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_HTTPHEADER => [
                'Accept: application/rss+xml, application/atom+xml, application/json, text/html;q=0.9, */*;q=0.8',
            ],
            CURLOPT_USERAGENT => 'Falles360 Cendra Sync/1.0',
        ]);

        $body = curl_exec($handle);
        $error = curl_error($handle);
        $statusCode = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle);

        if ($body === false) {
            throw new RuntimeException('No se pudo descargar Cendra: ' . ($error !== '' ? $error : 'respuesta vacia'));
        }

        if ($statusCode < 200 || $statusCode >= 300) {
            throw new RuntimeException('Cendra devolvio HTTP ' . $statusCode . '.');
        }

        $body = (string) $body;

        if (trim($body) === '') {
            throw new RuntimeException('Cendra devolvio una respuesta vacia.');
        }

        return $body;
    }

    $context = stream_context_create([
        'http' => [
            'timeout' => $timeoutSeconds,
            'header' => "Accept: application/rss+xml, application/atom+xml, application/json, text/html\r\n"
                . "User-Agent: Falles360 Cendra Sync/1.0\r\n",
        ],
    ]);

    $body = @file_get_contents($url, false, $context);

    if ($body === false) {
        throw new RuntimeException('No se pudo descargar el origen de Cendra.');
    }

    $statusLine = $http_response_header[0] ?? '';
    if (preg_match('/\s(\d{3})\s/', (string) $statusLine, $matches) === 1) {
        $statusCode = (int) ($matches[1] ?? 0);
        if ($statusCode < 200 || $statusCode >= 300) {
            throw new RuntimeException('Cendra devolvio HTTP ' . $statusCode . '.');
        }
    }

    $body = (string) $body;

    if (trim($body) === '') {
        throw new RuntimeException('Cendra devolvio una respuesta vacia.');
    }

    return $body;
}

function cendra_parse_source_payload(string $payload, string $sourceUrl, int $limit): array
{
    $trimmed = ltrim($payload);

    if ($trimmed === '') {
        return [];
    }

    $firstCharacter = $trimmed[0];

    if ($firstCharacter === '<') {
        if (preg_match('/^<\?xml/i', $trimmed) === 1 || preg_match('/^<(rss|feed|rdf:RDF)\b/i', $trimmed) === 1) {
            return cendra_parse_xml_payload($payload, $sourceUrl, $limit);
        }

        return cendra_parse_html_payload($payload, $sourceUrl, $limit);
    }

    if ($firstCharacter === '[' || $firstCharacter === '{') {
        return cendra_parse_json_payload($payload, $sourceUrl, $limit);
    }

    throw new RuntimeException('El origen de Cendra no devolvio XML, JSON ni HTML reconocible.');
}

function cendra_parse_xml_payload(string $payload, string $sourceUrl, int $limit): array
{
    if (!function_exists('simplexml_load_string')) {
        throw new RuntimeException('SimpleXML no esta disponible para procesar el feed de Cendra.');
    }

    $previous = libxml_use_internal_errors(true);
    $xml = simplexml_load_string($payload, SimpleXMLElement::class, LIBXML_NOCDATA);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    if (!$xml instanceof SimpleXMLElement) {
        throw new RuntimeException('No se pudo interpretar el feed XML de Cendra.');
    }

    $items = [];

    if (isset($xml->channel->item)) {
        foreach ($xml->channel->item as $item) {
            $items[] = cendra_normalize_article_item([
                'title' => (string) ($item->title ?? ''),
                'url' => cendra_xml_item_link($item),
                'published_at' => (string) ($item->pubDate ?? ''),
                'summary' => (string) ($item->description ?? ''),
                'content' => cendra_xml_item_content($item),
                'category' => cendra_xml_item_category($item),
                'author' => cendra_xml_item_author($item),
                'slug' => (string) ($item->slug ?? ''),
            ], $sourceUrl, 'xml');
        }
    } elseif (isset($xml->entry)) {
        foreach ($xml->entry as $entry) {
            $summary = (string) ($entry->summary ?? '');
            $content = (string) ($entry->content ?? '');
            $publishedAt = (string) ($entry->published ?? $entry->updated ?? '');
            $author = '';

            if (isset($entry->author->name)) {
                $author = (string) $entry->author->name;
            }

            $category = '';
            if (isset($entry->category)) {
                foreach ($entry->category as $categoryNode) {
                    $term = trim((string) (($categoryNode->attributes()['term'] ?? '') ?: (string) $categoryNode));
                    if ($term !== '') {
                        $category = $term;
                        break;
                    }
                }
            }

            $items[] = cendra_normalize_article_item([
                'title' => (string) ($entry->title ?? ''),
                'url' => cendra_xml_item_link($entry),
                'published_at' => $publishedAt,
                'summary' => $summary,
                'content' => $content !== '' ? $content : $summary,
                'category' => $category,
                'author' => $author,
                'slug' => (string) ($entry->id ?? ''),
            ], $sourceUrl, 'xml');
        }
    }

    return cendra_finalize_items($items, $limit);
}

function cendra_parse_json_payload(string $payload, string $sourceUrl, int $limit): array
{
    try {
        $decoded = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        throw new RuntimeException('No se pudo interpretar el JSON de Cendra.', 0, $exception);
    }

    if (is_array($decoded) && isset($decoded['items']) && is_array($decoded['items'])) {
        $decoded = $decoded['items'];
    } elseif (is_array($decoded) && isset($decoded['posts']) && is_array($decoded['posts'])) {
        $decoded = $decoded['posts'];
    }

    if (!is_array($decoded)) {
        throw new RuntimeException('El JSON de Cendra no contiene una lista de articulos.');
    }

    $items = [];

    foreach ($decoded as $row) {
        if (!is_array($row)) {
            continue;
        }

        $title = $row['title']['rendered'] ?? $row['title'] ?? '';
        $summary = $row['excerpt']['rendered'] ?? $row['summary'] ?? $row['description'] ?? '';
        $content = $row['content']['rendered'] ?? $row['content'] ?? $summary;
        $category = $row['category'] ?? $row['category_name'] ?? '';

        if ($category === '' && isset($row['_embedded']['wp:term'][0][0]['name'])) {
            $category = (string) $row['_embedded']['wp:term'][0][0]['name'];
        }

        $author = $row['author_name'] ?? $row['author'] ?? '';
        if ($author === '' && isset($row['_embedded']['author'][0]['name'])) {
            $author = (string) $row['_embedded']['author'][0]['name'];
        }

        $items[] = cendra_normalize_article_item([
            'title' => is_string($title) ? $title : '',
            'url' => (string) ($row['link'] ?? $row['url'] ?? ''),
            'published_at' => (string) ($row['date_gmt'] ?? $row['date'] ?? $row['published_at'] ?? ''),
            'summary' => is_string($summary) ? $summary : '',
            'content' => is_string($content) ? $content : '',
            'category' => is_string($category) ? $category : '',
            'author' => is_string($author) ? $author : '',
            'slug' => (string) ($row['slug'] ?? ''),
        ], $sourceUrl, 'json');
    }

    return cendra_finalize_items($items, $limit);
}

function cendra_parse_html_payload(string $payload, string $sourceUrl, int $limit): array
{
    if (!class_exists(DOMDocument::class)) {
        throw new RuntimeException('DOMDocument no esta disponible para procesar el HTML de Cendra.');
    }

    $previous = libxml_use_internal_errors(true);
    $document = new DOMDocument();
    $loaded = $document->loadHTML($payload);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    if ($loaded !== true) {
        throw new RuntimeException('No se pudo interpretar el HTML de Cendra.');
    }

    $xpath = new DOMXPath($document);
    $items = [];
    $articleNodes = $xpath->query('//article');

    if ($articleNodes instanceof DOMNodeList && $articleNodes->length > 0) {
        foreach ($articleNodes as $articleNode) {
            $titleNode = cendra_dom_first_node($xpath, $articleNode, './/h1//a[@href] | .//h2//a[@href] | .//h3//a[@href]');
            if (!$titleNode instanceof DOMElement) {
                continue;
            }

            $summary = cendra_dom_first_text(
                $xpath,
                $articleNode,
                './/p[not(ancestor::blockquote)][string-length(normalize-space()) > 0][1]'
            );
            $publishedAt = cendra_dom_first_attr($xpath, $articleNode, './/time[1]', 'datetime');

            if ($publishedAt === '') {
                $publishedAt = cendra_dom_first_text($xpath, $articleNode, './/time[1] | .//*[contains(@class, "date")][1]');
            }

            $category = cendra_dom_first_text(
                $xpath,
                $articleNode,
                './/a[contains(@rel, "category")][1] | .//*[contains(@class, "cat")][1]//a[1] | .//*[contains(@class, "category")][1]//a[1]'
            );
            $author = cendra_dom_first_text(
                $xpath,
                $articleNode,
                './/*[contains(@class, "author")]//a[1] | .//*[contains(@class, "author")]'
            );

            $items[] = cendra_normalize_article_item([
                'title' => $titleNode->textContent,
                'url' => $titleNode->getAttribute('href'),
                'published_at' => $publishedAt,
                'summary' => $summary,
                'content' => $summary,
                'category' => $category,
                'author' => $author,
                'slug' => '',
            ], $sourceUrl, 'html');
        }
    }

    if ($items === []) {
        $linkNodes = $xpath->query('//h3/a[@href]');
        if ($linkNodes instanceof DOMNodeList) {
            foreach ($linkNodes as $linkNode) {
                if (!$linkNode instanceof DOMElement) {
                    continue;
                }

                $items[] = cendra_normalize_article_item([
                    'title' => $linkNode->textContent,
                    'url' => $linkNode->getAttribute('href'),
                    'published_at' => '',
                    'summary' => '',
                    'content' => '',
                    'category' => '',
                    'author' => '',
                    'slug' => '',
                ], $sourceUrl, 'html');
            }
        }
    }

    return cendra_finalize_items($items, $limit);
}

function cendra_upsert_articles(array $items): array
{
    if ($items === []) {
        return [0, 0];
    }

    $urls = array_values(array_unique(array_map(
        static fn (array $item): string => (string) ($item['url'] ?? ''),
        $items
    )));

    $placeholders = implode(', ', array_fill(0, count($urls), '?'));
    $statement = db()->prepare("SELECT url FROM cendra_articles WHERE url IN ({$placeholders})");
    $statement->execute($urls);

    $existingUrls = [];
    foreach ($statement->fetchAll() ?: [] as $row) {
        $url = trim((string) ($row['url'] ?? ''));
        if ($url !== '') {
            $existingUrls[$url] = true;
        }
    }

    $inserted = 0;
    $updated = 0;
    $connection = db();
    $connection->beginTransaction();

    try {
        $upsert = $connection->prepare(
            'INSERT INTO cendra_articles (
                source,
                title,
                slug,
                url,
                published_at,
                summary,
                content,
                category,
                author,
                parsed_json,
                telegram_sent
             ) VALUES (
                :source,
                :title,
                :slug,
                :url,
                :published_at,
                :summary,
                :content,
                :category,
                :author,
                :parsed_json,
                :telegram_sent
             )
             ON DUPLICATE KEY UPDATE
                source = VALUES(source),
                title = VALUES(title),
                slug = VALUES(slug),
                published_at = VALUES(published_at),
                summary = VALUES(summary),
                content = VALUES(content),
                category = VALUES(category),
                author = VALUES(author),
                parsed_json = VALUES(parsed_json),
                updated_at = CURRENT_TIMESTAMP'
        );

        foreach ($items as $item) {
            $upsert->execute([
                'source' => $item['source'],
                'title' => $item['title'],
                'slug' => $item['slug'],
                'url' => $item['url'],
                'published_at' => $item['published_at'],
                'summary' => $item['summary'],
                'content' => $item['content'],
                'category' => $item['category'],
                'author' => $item['author'],
                'parsed_json' => $item['parsed_json'],
                'telegram_sent' => 0,
            ]);

            if (isset($existingUrls[$item['url']])) {
                $updated++;
            } else {
                $inserted++;
                $existingUrls[$item['url']] = true;
            }
        }

        $connection->commit();
    } catch (Throwable $exception) {
        if ($connection->inTransaction()) {
            $connection->rollBack();
        }

        throw $exception;
    }

    return [$inserted, $updated];
}

function cendra_finalize_items(array $items, int $limit): array
{
    $deduplicated = [];

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        $url = trim((string) ($item['url'] ?? ''));
        if ($url === '' || isset($deduplicated[$url])) {
            continue;
        }

        $deduplicated[$url] = $item;
    }

    return array_slice(array_values($deduplicated), 0, $limit);
}

function cendra_normalize_article_item(array $item, string $sourceUrl, string $format): ?array
{
    $title = cendra_normalize_text((string) ($item['title'] ?? ''));
    $url = cendra_normalize_url((string) ($item['url'] ?? ''), $sourceUrl);

    if ($title === '' || $url === '') {
        return null;
    }

    $summary = cendra_plain_text((string) ($item['summary'] ?? ''));
    $content = trim((string) ($item['content'] ?? ''));
    $category = cendra_normalize_text((string) ($item['category'] ?? ''));
    $author = cendra_normalize_text((string) ($item['author'] ?? ''));
    $publishedAt = cendra_parse_datetime((string) ($item['published_at'] ?? ''));
    $slug = cendra_normalize_slug((string) ($item['slug'] ?? ''));

    if ($slug === '') {
        $slug = cendra_slug_from_url_or_title($url, $title);
    }

    if ($content === '' && $summary !== '') {
        $content = '<p>' . h($summary) . '</p>';
    }

    $normalized = [
        'source' => 'cendra',
        'title' => cendra_truncate($title, 255),
        'slug' => $slug !== '' ? cendra_truncate($slug, 255) : null,
        'url' => cendra_truncate($url, 500),
        'published_at' => $publishedAt,
        'summary' => $summary !== '' ? $summary : null,
        'content' => $content !== '' ? $content : null,
        'category' => $category !== '' ? cendra_truncate($category, 100) : null,
        'author' => $author !== '' ? cendra_truncate($author, 100) : null,
        'parsed_json' => json_encode([
            'format' => $format,
            'source_url' => $sourceUrl,
            'normalized' => [
                'title' => $title,
                'url' => $url,
                'published_at' => $publishedAt,
                'category' => $category,
                'author' => $author,
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ];

    return $normalized;
}

function cendra_xml_item_link(SimpleXMLElement $item): string
{
    $directLink = trim((string) ($item->link ?? ''));

    if ($directLink !== '') {
        return $directLink;
    }

    foreach ($item->link as $linkNode) {
        $href = trim((string) ($linkNode->attributes()['href'] ?? ''));
        if ($href !== '') {
            return $href;
        }
    }

    return '';
}

function cendra_xml_item_content(SimpleXMLElement $item): string
{
    $content = '';
    $namespaces = $item->getNamespaces(true);

    if (isset($namespaces['content'])) {
        $contentNode = $item->children($namespaces['content']);
        $content = trim((string) ($contentNode->encoded ?? ''));
    }

    if ($content === '') {
        $content = trim((string) ($item->description ?? ''));
    }

    return $content;
}

function cendra_xml_item_category(SimpleXMLElement $item): string
{
    if (isset($item->category)) {
        foreach ($item->category as $categoryNode) {
            $value = trim((string) $categoryNode);
            if ($value !== '') {
                return $value;
            }
        }
    }

    return '';
}

function cendra_xml_item_author(SimpleXMLElement $item): string
{
    $author = trim((string) ($item->author ?? ''));

    if ($author !== '') {
        return $author;
    }

    $namespaces = $item->getNamespaces(true);

    if (isset($namespaces['dc'])) {
        $dc = $item->children($namespaces['dc']);
        $author = trim((string) ($dc->creator ?? ''));
    }

    return $author;
}

function cendra_dom_first_node(DOMXPath $xpath, DOMNode $contextNode, string $expression): ?DOMNode
{
    $nodes = $xpath->query($expression, $contextNode);

    return $nodes instanceof DOMNodeList && $nodes->length > 0 ? $nodes->item(0) : null;
}

function cendra_dom_first_text(DOMXPath $xpath, DOMNode $contextNode, string $expression): string
{
    $node = cendra_dom_first_node($xpath, $contextNode, $expression);

    return $node instanceof DOMNode ? cendra_normalize_text($node->textContent) : '';
}

function cendra_dom_first_attr(DOMXPath $xpath, DOMNode $contextNode, string $expression, string $attribute): string
{
    $node = cendra_dom_first_node($xpath, $contextNode, $expression);

    return $node instanceof DOMElement ? trim($node->getAttribute($attribute)) : '';
}

function cendra_normalize_url(string $url, string $sourceUrl): string
{
    $url = trim($url);

    if ($url === '') {
        return '';
    }

    if (filter_var($url, FILTER_VALIDATE_URL) !== false) {
        return $url;
    }

    if (str_starts_with($url, '//')) {
        $scheme = parse_url($sourceUrl, PHP_URL_SCHEME) ?: 'https';

        return $scheme . ':' . $url;
    }

    $scheme = parse_url($sourceUrl, PHP_URL_SCHEME) ?: 'https';
    $host = parse_url($sourceUrl, PHP_URL_HOST) ?: '';

    if ($host === '') {
        return $url;
    }

    if (str_starts_with($url, '/')) {
        return $scheme . '://' . $host . $url;
    }

    $path = (string) parse_url($sourceUrl, PHP_URL_PATH);
    $basePath = rtrim(str_replace('\\', '/', dirname($path !== '' ? $path : '/')), '/');

    return $scheme . '://' . $host . ($basePath !== '' ? $basePath . '/' : '/') . ltrim($url, '/');
}

function cendra_normalize_text(string $value): string
{
    $value = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

    return trim($value);
}

function cendra_plain_text(string $value): string
{
    return cendra_normalize_text($value);
}

function cendra_normalize_slug(string $slug): string
{
    $slug = trim($slug);

    if ($slug === '') {
        return '';
    }

    return cendra_slugify($slug);
}

function cendra_slug_from_url_or_title(string $url, string $title): string
{
    $path = trim((string) parse_url($url, PHP_URL_PATH), '/');

    if ($path !== '') {
        $segments = array_values(array_filter(explode('/', $path), static fn (string $segment): bool => $segment !== ''));
        $lastSegment = trim((string) end($segments));
        if ($lastSegment !== '') {
            return cendra_slugify($lastSegment);
        }
    }

    return cendra_slugify($title);
}

function cendra_slugify(string $value): string
{
    $value = mb_strtolower(trim($value), 'UTF-8');
    $transliterated = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    $normalized = $transliterated !== false ? $transliterated : $value;
    $normalized = preg_replace('/[^a-z0-9]+/i', '-', $normalized) ?? $normalized;

    return trim((string) $normalized, '-');
}

function cendra_parse_datetime(string $value): ?string
{
    $value = trim($value);

    if ($value === '') {
        return null;
    }

    try {
        return (new DateTimeImmutable($value))->format('Y-m-d H:i:s');
    } catch (Throwable) {
        $translated = cendra_translate_spanish_date($value);
        if ($translated !== $value) {
            try {
                return (new DateTimeImmutable($translated))->format('Y-m-d H:i:s');
            } catch (Throwable) {
                return null;
            }
        }
    }

    return null;
}

function cendra_translate_spanish_date(string $value): string
{
    return str_ireplace(
        [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre',
        ],
        [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'September', 'October', 'November', 'December',
        ],
        $value
    );
}

function cendra_truncate(string $value, int $maxLength): string
{
    return mb_strlen($value) > $maxLength
        ? rtrim(mb_substr($value, 0, max(1, $maxLength - 1))) . '…'
        : $value;
}

function cendra_host_label(string $url): string
{
    return (string) (parse_url($url, PHP_URL_HOST) ?: $url);
}

function cendra_error_message(Throwable $exception): string
{
    return cendra_truncate(trim($exception->getMessage()) !== '' ? trim($exception->getMessage()) : 'Error desconocido de Cendra.', 2000);
}

function cendra_summary_date_label(DateTimeInterface $date): string
{
    $monthNames = [
        1 => 'enero',
        2 => 'febrero',
        3 => 'marzo',
        4 => 'abril',
        5 => 'mayo',
        6 => 'junio',
        7 => 'julio',
        8 => 'agosto',
        9 => 'septiembre',
        10 => 'octubre',
        11 => 'noviembre',
        12 => 'diciembre',
    ];

    $month = $monthNames[(int) $date->format('n')] ?? $date->format('m');

    return sprintf('%d %s', (int) $date->format('j'), $month);
}

function cendra_article_summary_line(array $article): string
{
    $title = cendra_normalize_text((string) ($article['title'] ?? ''));
    $summary = cendra_first_sentence((string) ($article['summary'] ?? ''));

    if ($summary === '') {
        return cendra_truncate($title, 220);
    }

    $normalizedSummary = mb_strtolower($summary, 'UTF-8');
    $normalizedTitle = mb_strtolower($title, 'UTF-8');

    if ($normalizedSummary === $normalizedTitle) {
        return cendra_truncate($title, 220);
    }

    return cendra_truncate($title . ': ' . $summary, 260);
}

function cendra_first_sentence(string $value): string
{
    $plain = cendra_plain_text($value);

    if ($plain === '') {
        return '';
    }

    if (preg_match('/^(.+?[.!?])(\s|$)/u', $plain, $matches) === 1) {
        return trim((string) ($matches[1] ?? ''));
    }

    return cendra_truncate($plain, 180);
}

function cendra_daily_summary_telegram_text(array $summary): string
{
    $lines = [];

    $title = trim((string) ($summary['title'] ?? ''));
    if ($title !== '') {
        $lines[] = $title;
    }

    $detail = trim((string) ($summary['detail'] ?? ''));
    if ($detail !== '') {
        $lines[] = $detail;
    }

    $location = trim((string) ($summary['location'] ?? ''));
    if ($location !== '') {
        $lines[] = '📍 ' . $location;
    }

    $footer = trim((string) ($summary['footer'] ?? ''));
    if ($footer !== '') {
        $lines[] = $footer;
    }

    return trim(implode("\n\n", $lines));
}

function cendra_article_excerpt(array $article, int $maxLength = 220): string
{
    $summary = cendra_plain_text((string) ($article['summary'] ?? ''));

    if ($summary !== '') {
        return cendra_truncate($summary, $maxLength);
    }

    $content = cendra_plain_text((string) ($article['content'] ?? ''));

    if ($content === '') {
        return '';
    }

    return cendra_first_sentence($content);
}

function cendra_article_private_body(array $article, int $maxLength = 2600): string
{
    $content = cendra_plain_text((string) ($article['content'] ?? ''));

    if ($content !== '') {
        return cendra_truncate($content, $maxLength);
    }

    return cendra_article_excerpt($article, min($maxLength, 600));
}

function cendra_article_page_html(array $article): ?string
{
    static $cache = [];

    $articleUrl = trim((string) ($article['url'] ?? ''));

    if ($articleUrl === '') {
        return null;
    }

    if (array_key_exists($articleUrl, $cache)) {
        return $cache[$articleUrl];
    }

    try {
        $cache[$articleUrl] = cendra_http_get($articleUrl, cendra_sync_timeout_seconds());
    } catch (Throwable) {
        $cache[$articleUrl] = null;
    }

    return $cache[$articleUrl];
}

function cendra_article_body_from_html(string $html, int $maxLength = 9000): string
{
    if (trim($html) === '' || !class_exists(DOMDocument::class)) {
        return '';
    }

    $previous = libxml_use_internal_errors(true);
    $document = new DOMDocument();
    $loaded = $document->loadHTML($html);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    if ($loaded !== true) {
        return '';
    }

    $xpath = new DOMXPath($document);
    $container = null;
    $containerQueries = [
        '//*[contains(@class, "entry-content")][1]',
        '//*[contains(@class, "post-content")][1]',
        '//*[contains(@class, "td-post-content")][1]',
        '//*[contains(@class, "article-content")][1]',
        '//*[@itemprop="articleBody"][1]',
        '//article[1]',
        '//main[1]',
    ];

    foreach ($containerQueries as $query) {
        $node = cendra_dom_first_node($xpath, $document, $query);

        if ($node instanceof DOMNode) {
            $container = $node;
            break;
        }
    }

    if (!$container instanceof DOMNode) {
        return '';
    }

    $nodes = $xpath->query(
        './/h2 | .//h3 | .//p[not(ancestor::figure) and not(ancestor::figcaption)] | .//li',
        $container
    );

    if (!$nodes instanceof DOMNodeList) {
        return '';
    }

    $parts = [];

    foreach ($nodes as $node) {
        $text = cendra_normalize_text($node->textContent ?? '');

        if ($text === '') {
            continue;
        }

        if (($parts[count($parts) - 1] ?? null) === $text) {
            continue;
        }

        if (strtolower($node->nodeName) === 'li') {
            $text = '- ' . $text;
        }

        $parts[] = $text;
    }

    if ($parts === []) {
        $fallbackText = cendra_normalize_text($container->textContent ?? '');

        return $fallbackText !== '' ? cendra_truncate($fallbackText, $maxLength) : '';
    }

    return cendra_truncate(implode("\n\n", $parts), $maxLength);
}

function cendra_article_full_body(array $article, int $maxLength = 9000): string
{
    $content = cendra_plain_text((string) ($article['content'] ?? ''));

    if ($content !== '' && strlen($content) >= 700) {
        return cendra_truncate($content, $maxLength);
    }

    $pageHtml = cendra_article_page_html($article);

    if (is_string($pageHtml) && trim($pageHtml) !== '') {
        $parsedBody = cendra_article_body_from_html($pageHtml, $maxLength);

        if ($parsedBody !== '') {
            return $parsedBody;
        }
    }

    if ($content !== '') {
        return cendra_truncate($content, $maxLength);
    }

    return cendra_article_excerpt($article, min($maxLength, 900));
}

function cendra_article_channel_full_text(array $article, int $maxLength = 9000): string
{
    $title = trim((string) ($article['title'] ?? ''));
    $body = cendra_article_full_body($article, max(1200, $maxLength));
    $publishedAt = trim((string) ($article['published_at'] ?? ''));
    $category = trim((string) ($article['category'] ?? ''));
    $author = trim((string) ($article['author'] ?? ''));
    $lines = [];

    if ($title !== '') {
        $lines[] = $title;
    }

    if ($publishedAt !== '') {
        $lines[] = 'Publicado: ' . cendra_human_datetime_label($publishedAt);
    }

    if ($category !== '') {
        $lines[] = 'Categoria: ' . $category;
    }

    if ($author !== '') {
        $lines[] = 'Firma: ' . $author;
    }

    if ($body !== '') {
        $lines[] = '';
        $lines[] = $body;
    }

    return cendra_truncate(trim(implode("\n", $lines)), $maxLength);
}

function cendra_format_article_search_result(array $article): array
{
    return [
        'id' => (int) ($article['id'] ?? 0),
        'title' => (string) ($article['title'] ?? ''),
        'url' => cendra_safe_public_url((string) ($article['url'] ?? '')) ?? '',
        'published_at' => $article['published_at'] ?? null,
        'publishedAt' => $article['published_at'] ?? null,
        'summary' => (string) ($article['summary'] ?? ''),
        'excerpt' => cendra_article_excerpt($article),
        'category' => (string) ($article['category'] ?? ''),
        'author' => (string) ($article['author'] ?? ''),
        'telegram_sent' => (bool) ($article['telegram_sent'] ?? false),
        'telegramSent' => (bool) ($article['telegram_sent'] ?? false),
        'landingPublished' => (bool) ($article['landing_published'] ?? false),
        'landingPublishedAt' => $article['landing_published_at'] ?? null,
        'landingTitle' => (string) ($article['landing_title'] ?? ''),
        'landingExcerpt' => (string) ($article['landing_excerpt'] ?? ''),
    ];
}

function cendra_safe_public_url(?string $value): ?string
{
    $url = trim((string) ($value ?? ''));

    if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
        return null;
    }

    $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

    if (!in_array($scheme, ['http', 'https'], true)) {
        return null;
    }

    return $url;
}

function cendra_article_image_candidate_url(?string $value, string $baseUrl = ''): ?string
{
    $candidate = trim((string) ($value ?? ''));

    if ($candidate === '') {
        return null;
    }

    if ($baseUrl !== '') {
        $candidate = cendra_normalize_url($candidate, $baseUrl);
    }

    if (filter_var($candidate, FILTER_VALIDATE_URL) === false) {
        return null;
    }

    $scheme = strtolower((string) parse_url($candidate, PHP_URL_SCHEME));

    return in_array($scheme, ['http', 'https'], true) ? $candidate : null;
}

function cendra_article_image_from_array(mixed $value, string $baseUrl = '', int $depth = 0): ?string
{
    if (!is_array($value) || $depth > 6) {
        return null;
    }

    $candidateKeys = [
        'image',
        'image_url',
        'imageUrl',
        'thumbnail',
        'thumbnail_url',
        'thumbnailUrl',
        'featured_image',
        'featuredImage',
        'cover_image',
        'coverImage',
        'hero_image',
        'heroImage',
        'photo',
        'photo_url',
        'photoUrl',
        'src',
    ];

    foreach ($candidateKeys as $key) {
        if (!array_key_exists($key, $value)) {
            continue;
        }

        $resolved = cendra_article_image_candidate_url(is_scalar($value[$key]) ? (string) $value[$key] : null, $baseUrl);

        if ($resolved !== null) {
            return $resolved;
        }
    }

    foreach ($value as $nested) {
        $resolved = cendra_article_image_from_array($nested, $baseUrl, $depth + 1);

        if ($resolved !== null) {
            return $resolved;
        }
    }

    return null;
}

function cendra_article_image_from_html(string $html, string $baseUrl = ''): ?string
{
    if (trim($html) === '' || !class_exists(DOMDocument::class)) {
        return null;
    }

    $previous = libxml_use_internal_errors(true);
    $document = new DOMDocument();
    $loaded = $document->loadHTML($html);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    if ($loaded !== true) {
        return null;
    }

    $xpath = new DOMXPath($document);
    $candidates = [
        cendra_dom_first_attr($xpath, $document, './/meta[@property="og:image"][1]', 'content'),
        cendra_dom_first_attr($xpath, $document, './/meta[@name="og:image"][1]', 'content'),
        cendra_dom_first_attr($xpath, $document, './/meta[@name="twitter:image"][1] | .//meta[@property="twitter:image"][1]', 'content'),
        cendra_dom_first_attr($xpath, $document, './/article//img[@src][1] | .//main//img[@src][1] | .//img[@src][1]', 'src'),
    ];

    foreach ($candidates as $candidate) {
        $resolved = cendra_article_image_candidate_url($candidate, $baseUrl);

        if ($resolved !== null) {
            return $resolved;
        }
    }

    return null;
}

function cendra_article_image_url(array $article): ?string
{
    $articleUrl = trim((string) ($article['url'] ?? ''));

    foreach (['image_url', 'imageUrl', 'photo_url', 'photoUrl', 'thumbnail_url', 'thumbnailUrl'] as $key) {
        if (!array_key_exists($key, $article)) {
            continue;
        }

        $resolved = cendra_article_image_candidate_url((string) $article[$key], $articleUrl);

        if ($resolved !== null) {
            return $resolved;
        }
    }

    if (isset($article['parsed_json']) && is_string($article['parsed_json']) && trim($article['parsed_json']) !== '') {
        $decoded = json_decode($article['parsed_json'], true);

        if (is_array($decoded)) {
            $resolved = cendra_article_image_from_array($decoded, $articleUrl);

            if ($resolved !== null) {
                return $resolved;
            }
        }
    }

    foreach (['content', 'summary'] as $key) {
        $html = trim((string) ($article[$key] ?? ''));

        if ($html === '' || stripos($html, '<img') === false) {
            continue;
        }

        $resolved = cendra_article_image_from_html($html, $articleUrl);

        if ($resolved !== null) {
            return $resolved;
        }
    }

    if ($articleUrl === '') {
        return null;
    }

    $pageHtml = cendra_article_page_html($article);

    if (!is_string($pageHtml) || trim($pageHtml) === '') {
        return null;
    }

    return cendra_article_image_from_html($pageHtml, $articleUrl);
}

function cendra_article_telegram_payload(array $article): array
{
    $title = trim((string) ($article['title'] ?? ''));
    $excerpt = cendra_article_excerpt($article, 260);
    $publishedAt = trim((string) ($article['published_at'] ?? ''));
    $detailLines = [];

    if ($excerpt !== '') {
        $detailLines[] = $excerpt;
    }

    if ($publishedAt !== '') {
        $detailLines[] = 'Publicado: ' . cendra_human_datetime_label($publishedAt);
    }

    if (trim((string) ($article['category'] ?? '')) !== '') {
        $detailLines[] = 'Categoria: ' . trim((string) ($article['category'] ?? ''));
    }

    if (trim((string) ($article['author'] ?? '')) !== '') {
        $detailLines[] = 'Firma: ' . trim((string) ($article['author'] ?? ''));
    }

    return [
        'type' => 'novedad',
        'title' => $title,
        'detail' => implode("\n", $detailLines),
        'location' => 'Valencia · cobertura Falles360',
        'footer' => 'Mas cobertura y avisos en Falles360.',
        'buttonText' => 'Leer mas',
        'buttonUrl' => (string) ($article['url'] ?? ''),
        'imageUrl' => cendra_article_image_url($article),
        'imageStyle' => 'cendra_crop_top',
        'fullText' => cendra_article_channel_full_text($article),
        'target' => 'channel',
    ];
}

function cendra_query_summary_payload(array $articles, ?string $query = null, int $maxItems = 4): array
{
    $normalizedQuery = trim((string) ($query ?? ''));
    $selectedArticles = array_slice($articles, 0, max(1, min(6, $maxItems)));
    $lines = [];

    foreach ($selectedArticles as $article) {
        if (!is_array($article)) {
            continue;
        }

        $lines[] = '• ' . cendra_article_summary_line($article);
    }

    if ($lines === []) {
        throw new RuntimeException('No hay articulos suficientes para preparar el borrador del canal.');
    }

    $headline = $normalizedQuery !== ''
        ? 'Seguimiento fallero · ' . cendra_truncate($normalizedQuery, 80)
        : 'Actualizacion fallera';

    $intro = $normalizedQuery !== ''
        ? 'Estas son las claves mas relevantes sobre ' . $normalizedQuery . ':'
        : 'Estas son las claves falleras mas relevantes recopiladas ahora mismo:';

    return [
        'type' => 'novedad',
        'target' => 'channel',
        'title' => $headline,
        'detail' => cendra_truncate(
            $intro . "\n\n" . implode("\n", $lines) . "\n\nSeguiremos actualizando la informacion desde Falles360.",
            3500
        ),
        'location' => 'Valencia · seguimiento Falles360',
        'footer' => 'Mas cobertura y avisos en Falles360.',
        'query' => $normalizedQuery !== '' ? $normalizedQuery : null,
        'article_count' => count($selectedArticles),
        'articles' => array_map(static function (array $article): array {
            return [
                'id' => (int) ($article['id'] ?? 0),
                'title' => (string) ($article['title'] ?? ''),
                'url' => (string) ($article['url'] ?? ''),
                'published_at' => $article['published_at'] ?? null,
            ];
        }, $selectedArticles),
    ];
}

function cendra_periodic_review_payload(array $articles, int $maxItems = 4): array
{
    $selectedArticles = array_slice($articles, 0, max(1, min(6, $maxItems)));
    $lines = [];

    foreach ($selectedArticles as $article) {
        if (!is_array($article)) {
            continue;
        }

        $lines[] = '• ' . cendra_article_summary_line($article);
    }

    if ($lines === []) {
        throw new RuntimeException('No hay articulos pendientes para preparar el resumen periodico.');
    }

    return [
        'type' => 'novedad',
        'target' => 'channel',
        'title' => 'Resumen pendiente para canal',
        'detail' => cendra_truncate(
            "Estas son las claves falleras que siguen pendientes de revision para el canal.\n\n"
            . implode("\n", $lines)
            . "\n\nCuando lo tengas claro, confirma la publicacion desde el bot.",
            3500
        ),
        'location' => 'Valencia · seguimiento Falles360',
        'footer' => 'Mas cobertura y avisos en Falles360.',
        'article_count' => count($selectedArticles),
        'articles' => array_map(static function (array $article): array {
            return [
                'id' => (int) ($article['id'] ?? 0),
                'title' => (string) ($article['title'] ?? ''),
                'url' => (string) ($article['url'] ?? ''),
                'published_at' => $article['published_at'] ?? null,
            ];
        }, $selectedArticles),
    ];
}

function cendra_article_direct_telegram_text(array $article): string
{
    $summary = cendra_article_excerpt($article, 420);
    $fullBody = cendra_article_private_body($article, 2600);
    $metaLines = [];
    $publishedAt = trim((string) ($article['published_at'] ?? ''));
    $category = trim((string) ($article['category'] ?? ''));
    $author = trim((string) ($article['author'] ?? ''));
    $buttonUrl = trim((string) ($article['url'] ?? ''));

    if ($publishedAt !== '') {
        $metaLines[] = 'Publicado: ' . cendra_human_datetime_label($publishedAt);
    }

    if ($category !== '') {
        $metaLines[] = 'Categoría: ' . $category;
    }

    if ($author !== '') {
        $metaLines[] = 'Firma: ' . $author;
    }

    $lines = [
        '📰 CENDRA DIGITAL',
        '',
        (string) ($article['title'] ?? ''),
    ];

    $lines[0] = 'ARTICULO PARA REVISAR';

    if ($metaLines !== []) {
        $lines[] = '';

        foreach ($metaLines as $line) {
            $lines[] = $line;
        }
    }

    if ($summary !== '') {
        $lines[] = '';
        $lines[] = 'Resumen:';
        $lines[] = $summary;
    }

    if ($fullBody !== '' && $fullBody !== $summary) {
        $lines[] = '';
        $lines[] = 'Texto ampliado:';
        $lines[] = $fullBody;
    }

    if ($buttonUrl !== '') {
        $lines[] = '';
        $lines[] = 'Leer original: ' . $buttonUrl;
    }

    if ($buttonUrl !== '' || $summary !== '' || $fullBody !== '') {
        $lines[] = '';
        $lines[] = 'Uso interno Falles360 · listo para revision antes de publicar en el canal.';
    }

    return trim(implode("\n", $lines));
}

function cendra_search_results_telegram_text(array $articles, ?string $query = null): string
{
    $normalizedQuery = trim((string) ($query ?? ''));
    $lines = [];
    $lines[] = '📰 CENDRA DIGITAL';
    $lines[] = '';
    $lines[] = $normalizedQuery !== ''
        ? 'Resultados para: "' . $normalizedQuery . '"'
        : 'Ultimas publicaciones detectadas en Cendra Digital';
    $lines[] = '';
    $lines[0] = 'RESULTADOS DE NOTICIAS';

    if ($normalizedQuery === '') {
        $lines[2] = 'Ultimas publicaciones detectadas';
    }

    $lines[0] = 'RESULTADOS DE NOTICIAS';

    if ($normalizedQuery === '') {
        $lines[2] = 'Ultimas publicaciones detectadas';
    }

    foreach ($articles as $article) {
        $title = trim((string) ($article['title'] ?? ''));
        $url = trim((string) ($article['url'] ?? ''));
        $excerpt = cendra_article_excerpt($article, 160);
        $lines[] = '• ' . $title;
        if ($excerpt !== '') {
            $lines[] = '  ' . $excerpt;
        }
        if ($url !== '') {
            $lines[] = '  ' . $url;
        }
        $lines[] = '';
    }

    return trim(implode("\n", $lines));
}

function cendra_human_datetime_label(string $value): string
{
    try {
        $date = new DateTimeImmutable($value);
    } catch (Throwable) {
        return $value;
    }

    return cendra_summary_date_label($date) . ' · ' . $date->format('H:i');
}
