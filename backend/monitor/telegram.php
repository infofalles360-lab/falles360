<?php
declare(strict_types=1);

require_once __DIR__ . '/config_monitor.php';

function sendTelegramMessage(string $message): array
{
    $chatId = trim((string) TELEGRAM_CHAT_ID);

    if ($chatId === '') {
        return [
            'ok' => false,
            'error' => 'Falta TELEGRAM_CHAT_ID, TELEGRAM_ADMIN_CHAT_ID o TELEGRAM_CHANNEL_ID en el entorno.',
        ];
    }

    try {
        $result = telegram_send_message($chatId, $message, [
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => false,
        ], 20);

        return [
            'ok' => true,
            'result' => $result,
        ];
    } catch (Throwable $exception) {
        error_log('Fallas360 Monitor Telegram error: ' . $exception->getMessage());

        return [
            'ok' => false,
            'error' => $exception->getMessage(),
        ];
    }
}
