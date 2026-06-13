<?php
declare(strict_types=1);

require_once __DIR__ . '/summary_lib.php';

$updates = monitor_fetch_daily_updates();
$telegramResult = sendTelegramMessage(monitor_daily_summary_message($updates));
monitor_mark_daily_summary_sent($updates);

echo json_encode([
    'ok' => (bool) ($telegramResult['ok'] ?? false),
    'updates' => count($updates),
    'telegram' => $telegramResult['ok'] ?? false,
    'error' => $telegramResult['error'] ?? null,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
