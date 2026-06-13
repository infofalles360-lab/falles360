<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

try {
    if (!telegram_is_configured()) {
        throw new RuntimeException('El bot de Telegram no esta configurado.');
    }

    $summary = cendra_daily_summary_payload();
    $statement = db()->prepare(
        "SELECT id
         FROM users
         WHERE role IN ('admin', 'support')
           AND status = :status"
    );
    $statement->execute(['status' => 'active']);
    $sent = 0;

    foreach ($statement->fetchAll() ?: [] as $row) {
        $userId = (int) ($row['id'] ?? 0);
        if ($userId <= 0) {
            continue;
        }

        $linkedUser = telegram_get_linked_user($userId);
        if (!is_array($linkedUser) || trim((string) ($linkedUser['chatId'] ?? '')) === '') {
            continue;
        }

        telegram_send_cendra_summary_review_to_chat($linkedUser['chatId'], $summary, [
            'action' => 'cendra_daily_summary_publish_approved',
            'userId' => $userId,
            'query' => 'resumen diario',
            'articleIds' => array_values(array_filter(array_map(
                static fn (array $article): int => (int) ($article['id'] ?? 0),
                is_array($summary['articles'] ?? null) ? $summary['articles'] : []
            ))),
        ]);
        $sent++;
    }

    echo json_encode([
        'ok' => true,
        'articleCount' => (int) ($summary['article_count'] ?? 0),
        'sentAdmins' => $sent,
        'summaryDate' => $summary['summary_date'] ?? null,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
} catch (Throwable $exception) {
    fwrite(STDERR, 'No se pudo enviar el resumen diario a admins: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
