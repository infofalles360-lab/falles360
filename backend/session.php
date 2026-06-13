<?php
declare(strict_types=1);

function app_session_storage_path(): string
{
    $configured = trim((string) (getenv('FALLES_SESSION_SAVE_PATH') ?: ''));

    if ($configured !== '') {
        return $configured;
    }

    return dirname(__DIR__, 4) . '/runtime/falles360/sessions';
}

function app_start_session(): void
{
    if (function_exists('app_is_cli') && app_is_cli()) {
        return;
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $app = app_config()['app'];
    $isHttps = function_exists('app_is_https_request')
        ? app_is_https_request()
        : (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $sameSite = getenv('FALLES_SESSION_SAMESITE') ?: 'Lax';
    $sameSite = in_array($sameSite, ['Lax', 'Strict'], true) ? $sameSite : 'Lax';

    session_name($app['session_name']);
    $sessionPath = app_session_storage_path();

    if (!is_dir($sessionPath)) {
        mkdir($sessionPath, 0700, true);
    }

    @ini_set('session.use_strict_mode', '1');
    @ini_set('session.use_only_cookies', '1');
    @ini_set('session.cookie_httponly', '1');
    @ini_set('session.cookie_secure', $isHttps ? '1' : '0');
    @ini_set('session.cookie_samesite', $sameSite);
    @ini_set('session.sid_length', '48');
    @ini_set('session.sid_bits_per_character', '6');
    @ini_set('session.gc_maxlifetime', (string) (60 * 60 * 24 * 30));

    session_save_path($sessionPath);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => $sameSite,
    ]);

    session_start();
}
