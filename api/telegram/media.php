<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/database.php';
require_once __DIR__ . '/../../backend/security.php';
require_once __DIR__ . '/../../backend/rate_limit.php';

app_apply_security_headers();

rate_limit_api_enforce('api_telegram_media', [
    ['scope' => 'ip', 'max' => 60, 'window' => 60],
], app_rate_limit_context(null));

$file = basename((string) app_sanitize_input_value($_GET['file'] ?? '', ['max_bytes' => 80]));

if ($file === '' || preg_match('/^[a-f0-9]{40}\.jpg$/', $file) !== 1) {
    http_response_code(404);
    exit;
}

$filePath = dirname(__DIR__, 2) . '/dashboard/server/runtime/telegram-media/' . $file;

if (!is_file($filePath)) {
    http_response_code(404);
    exit;
}

header('Content-Type: image/jpeg');
header('Content-Length: ' . (string) filesize($filePath));
header('Cache-Control: public, max-age=86400');
readfile($filePath);
