<?php
declare(strict_types=1);

if (!function_exists('falles360_load_env_file')) {
    function falles360_load_env_file(string $filePath): void
    {
        if (!is_file($filePath) || !is_readable($filePath)) {
            return;
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES);

        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $trimmed = trim($line);

            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }

            if (str_starts_with($trimmed, 'export ')) {
                $trimmed = trim(substr($trimmed, 7));
            }

            $separatorPosition = strpos($trimmed, '=');

            if ($separatorPosition === false) {
                continue;
            }

            $name = trim(substr($trimmed, 0, $separatorPosition));
            $value = trim(substr($trimmed, $separatorPosition + 1));

            if ($name === '') {
                continue;
            }

            if (
                strlen($value) >= 2
                && (
                    ($value[0] === '"' && substr($value, -1) === '"')
                    || ($value[0] === "'" && substr($value, -1) === "'")
                )
            ) {
                $value = substr($value, 1, -1);
            }

            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

if (!function_exists('falles360_load_env_files')) {
    function falles360_load_env_files(): void
    {
        static $loaded = false;

        if ($loaded) {
            return;
        }

        $projectRoot = dirname(__DIR__);
        $workspaceRoot = dirname($projectRoot);
        $candidates = [
            $workspaceRoot . '/.env',
            $workspaceRoot . '/.env.local',
            $projectRoot . '/.env',
            $projectRoot . '/.env.local',
        ];

        foreach ($candidates as $candidate) {
            falles360_load_env_file($candidate);
        }

        $loaded = true;
    }
}

falles360_load_env_files();

$dashboardDistPath = dirname(__DIR__) . '/dashboard/dist/index.html';
$dashboardVersion = is_file($dashboardDistPath) ? (string) filemtime($dashboardDistPath) : '1';

return [
    'db' => [
        'host' => getenv('FALLES_DB_HOST') ?: '127.0.0.1',
        'port' => (int) (getenv('FALLES_DB_PORT') ?: 3306),
        'name' => getenv('FALLES_DB_NAME') ?: 'fallas_app',
        'user' => getenv('FALLES_DB_USER') ?: 'root',
        'pass' => getenv('FALLES_DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ],
    'app' => [
        'session_name' => getenv('FALLES_SESSION_NAME') ?: 'falles360_session',
        'login_url' => './login.php',
        'dashboard_url' => './dashboard/dist/index.html?v=' . rawurlencode($dashboardVersion),
        'public_app_url' => './app/index.php',
        'home_url' => './',
        'guest_name' => 'Invitado',
    ],
];
