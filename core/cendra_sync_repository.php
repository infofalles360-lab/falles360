<?php
declare(strict_types=1);

function cendra_sync_runs_table_name(): string
{
    return 'cendra_sync_runs';
}

function cendra_sync_runs_table_sql(): string
{
    return <<<SQL
CREATE TABLE IF NOT EXISTS cendra_sync_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    started_at DATETIME NOT NULL,
    finished_at DATETIME NULL,
    status VARCHAR(30) NOT NULL,
    new_items INT NOT NULL DEFAULT 0,
    notes TEXT NULL,
    KEY idx_cendra_sync_runs_status (status),
    KEY idx_cendra_sync_runs_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
}

function cendra_sync_runs_ensure_table(): void
{
    db()->exec(cendra_sync_runs_table_sql());
}

function cendra_sync_run_start(string $status = 'running', ?string $notes = null, ?DateTimeInterface $startedAt = null): int
{
    cendra_sync_runs_ensure_table();

    $statement = db()->prepare(
        'INSERT INTO cendra_sync_runs (started_at, status, notes)
         VALUES (:started_at, :status, :notes)'
    );
    $statement->execute([
        'started_at' => ($startedAt ?? new DateTimeImmutable())->format('Y-m-d H:i:s'),
        'status' => trim($status) !== '' ? trim($status) : 'running',
        'notes' => $notes !== null && trim($notes) !== '' ? trim($notes) : null,
    ]);

    return (int) db()->lastInsertId();
}

function cendra_sync_run_finish(
    int $runId,
    string $status,
    int $newItems = 0,
    ?string $notes = null,
    ?DateTimeInterface $finishedAt = null
): void {
    cendra_sync_runs_ensure_table();

    $statement = db()->prepare(
        'UPDATE cendra_sync_runs
         SET finished_at = :finished_at,
             status = :status,
             new_items = :new_items,
             notes = :notes
         WHERE id = :id'
    );
    $statement->execute([
        'finished_at' => ($finishedAt ?? new DateTimeImmutable())->format('Y-m-d H:i:s'),
        'status' => trim($status) !== '' ? trim($status) : 'completed',
        'new_items' => max(0, $newItems),
        'notes' => $notes !== null && trim($notes) !== '' ? trim($notes) : null,
        'id' => $runId,
    ]);
}

function cendra_sync_run_mark_failed(int $runId, ?string $notes = null, ?DateTimeInterface $finishedAt = null): void
{
    cendra_sync_run_finish($runId, 'failed', 0, $notes, $finishedAt);
}

function cendra_sync_run_recent(int $limit = 20): array
{
    cendra_sync_runs_ensure_table();

    $limit = max(1, min($limit, 100));
    $statement = db()->prepare(
        'SELECT id, started_at, finished_at, status, new_items, notes
         FROM cendra_sync_runs
         ORDER BY started_at DESC, id DESC
         LIMIT :limit'
    );
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->execute();

    return $statement->fetchAll() ?: [];
}

function cendra_sync_run_latest(): ?array
{
    $rows = cendra_sync_run_recent(1);

    return $rows[0] ?? null;
}
