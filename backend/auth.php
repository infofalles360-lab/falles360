<?php
declare(strict_types=1);

function app_url(string $key): string
{
    $value = (string) app_config()['app'][$key];

    if ($value === '' || preg_match('#^https?://#i', $value) === 1 || str_starts_with($value, '/')) {
        return $value;
    }

    if (str_starts_with($value, './')) {
        return app_base_url() . '/' . ltrim(substr($value, 2), '/');
    }

    return app_base_url() . '/' . ltrim($value, '/');
}

function app_base_url(): string
{
    static $baseUrl;

    if (is_string($baseUrl)) {
        return $baseUrl;
    }

    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    $segments = array_values(array_filter(explode('/', trim($scriptName, '/')), static fn (string $segment): bool => $segment !== ''));
    $projectRoot = basename(dirname(__DIR__));
    $baseSegments = [];

    foreach ($segments as $segment) {
        $baseSegments[] = $segment;
        if ($segment === $projectRoot) {
            break;
        }
    }

    $baseUrl = '/' . implode('/', $baseSegments);

    return $baseUrl === '/' ? '' : rtrim($baseUrl, '/');
}

function redirect_to(string $url): never
{
    header('Location: ' . $url);
    exit;
}

function client_ip_address(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'), 0, 45);
}

function client_user_agent(): string
{
    return substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'), 0, 255);
}

function current_user(): ?array
{
    return isset($_SESSION['auth_user']) && is_array($_SESSION['auth_user'])
        ? $_SESSION['auth_user']
        : null;
}

function is_authenticated(): bool
{
    return current_user() !== null;
}

function require_authentication(): void
{
    if (!is_authenticated()) {
        redirect_to(with_lang(app_url('login_url')));
    }
}

function post_auth_redirect_url(?array $user = null): string
{
    return app_url('dashboard_url');
}

function find_user_by_email(string $email): ?array
{
    $columns = [
        'id',
        'name',
        'email',
        'password',
        'role',
        'commission_id',
        'status',
        'last_login_at',
    ];

    if (auth_table_has_column('users', 'failed_login_attempts')) {
        $columns[] = 'failed_login_attempts';
    }

    if (auth_table_has_column('users', 'account_locked_until')) {
        $columns[] = 'account_locked_until';
    }

    $statement = db()->prepare(
        'SELECT ' . implode(', ', $columns) . '
         FROM users
         WHERE email = :email
         LIMIT 1'
    );
    $statement->execute(['email' => $email]);
    $user = $statement->fetch();

    return $user ?: null;
}

function normalize_user_name(string $name): string
{
    return trim((string) preg_replace('/\s+/u', ' ', $name));
}

function auth_session_ttl_days(): int
{
    return max(1, min(60, (int) (getenv('FALLES_SESSION_TTL_DAYS') ?: 30)));
}

function auth_supported_tables(): array
{
    return [
        'users' => true,
        'user_sessions' => true,
        'login_attempts' => true,
        'password_reset_tokens' => true,
    ];
}

function auth_table_columns(string $table): array
{
    static $cache = [];

    $table = strtolower(trim($table));

    if (!isset(auth_supported_tables()[$table])) {
        return [];
    }

    if (isset($cache[$table])) {
        return $cache[$table];
    }

    try {
        $statement = db()->query('SHOW COLUMNS FROM `' . $table . '`');
        $columns = [];

        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $field = strtolower((string) ($row['Field'] ?? ''));

            if ($field !== '') {
                $columns[$field] = true;
            }
        }

        $cache[$table] = $columns;
    } catch (Throwable $exception) {
        $cache[$table] = [];
    }

    return $cache[$table];
}

function auth_table_has_column(string $table, string $column): bool
{
    return isset(auth_table_columns($table)[strtolower(trim($column))]);
}

function auth_session_token_params(string $rawToken): array
{
    return [
        'token_hash' => auth_hash_token($rawToken),
        'token_raw' => $rawToken,
    ];
}

function auth_session_token_condition(string $column = 'session_token'): string
{
    return sprintf('(%1$s = :token_hash OR %1$s = :token_raw)', $column);
}

function auth_hash_token(string $token): string
{
    return hash('sha256', $token);
}

function auth_destroy_php_session(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => (bool) $params['secure'],
            'httponly' => (bool) $params['httponly'],
            'samesite' => $params['samesite'] ?: 'Lax',
        ]);
        setcookie(csrf_cookie_name(), '', [
            'expires' => time() - 42000,
            'path' => '/',
            'domain' => '',
            'secure' => app_is_https_request(),
            'httponly' => false,
            'samesite' => 'Lax',
        ]);
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
}

function auth_revoke_persisted_session(?string $rawToken): void
{
    $token = trim((string) $rawToken);

    if ($token === '') {
        return;
    }

    try {
        if (auth_table_has_column('user_sessions', 'revoked_at')) {
            $statement = db()->prepare(
                'UPDATE user_sessions
                 SET revoked_at = NOW()' . (auth_table_has_column('user_sessions', 'updated_at') ? ',
                     updated_at = CURRENT_TIMESTAMP' : '') . '
                 WHERE ' . auth_session_token_condition('session_token') . '
                   AND revoked_at IS NULL'
            );
            $statement->execute(auth_session_token_params($token));
        } else {
            $statement = db()->prepare(
                'DELETE FROM user_sessions
                 WHERE ' . auth_session_token_condition('session_token')
            );
            $statement->execute(auth_session_token_params($token));
        }
    } catch (Throwable $exception) {
        // Ignorado.
    }
}

function auth_touch_persisted_session(int $userId, string $rawToken): void
{
    $lastTouchAt = isset($_SESSION['auth_user']['last_activity_touch']) ? (int) $_SESSION['auth_user']['last_activity_touch'] : 0;
    $now = time();

    if (($now - $lastTouchAt) < 60) {
        return;
    }

    try {
        $set = [
            'ip_address = :ip_address',
            'user_agent = :user_agent',
        ];
        $where = [
            'user_id = :user_id',
            auth_session_token_condition('session_token'),
        ];

        if (auth_table_has_column('user_sessions', 'last_activity_at')) {
            $set[] = 'last_activity_at = NOW()';
        }

        if (auth_table_has_column('user_sessions', 'updated_at')) {
            $set[] = 'updated_at = CURRENT_TIMESTAMP';
        }

        if (auth_table_has_column('user_sessions', 'revoked_at')) {
            $where[] = 'revoked_at IS NULL';
        }

        $statement = db()->prepare(
            'UPDATE user_sessions
             SET ' . implode(",\n                 ", $set) . '
             WHERE ' . implode("\n               AND ", $where)
        );
        $statement->execute(array_merge([
            'user_id' => $userId,
            'ip_address' => client_ip_address(),
            'user_agent' => client_user_agent(),
        ], auth_session_token_params($rawToken)));
        $_SESSION['auth_user']['last_activity_touch'] = $now;
    } catch (Throwable $exception) {
        // Ignorado.
    }
}

function app_bootstrap_authenticated_session(): void
{
    if (app_is_cli() || session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }

    $user = current_user();

    if ($user === null) {
        return;
    }

    if (strtolower((string) ($user['type'] ?? 'guest')) === 'guest') {
        return;
    }

    $userId = isset($user['id']) ? (int) $user['id'] : 0;
    $rawToken = trim((string) ($user['session_token'] ?? ''));

    if ($userId <= 0 || $rawToken === '') {
        security_log_event('session_payload_invalid', [
            'endpoint' => app_request_endpoint(),
        ], $userId > 0 ? $userId : null);
        auth_destroy_php_session();

        return;
    }

    try {
        $where = [
            'user_sessions.user_id = :user_id',
            auth_session_token_condition('user_sessions.session_token'),
            'user_sessions.expires_at >= NOW()',
        ];

        if (auth_table_has_column('user_sessions', 'revoked_at')) {
            $where[] = 'user_sessions.revoked_at IS NULL';
        }

        $statement = db()->prepare(
            'SELECT user_sessions.user_id, user_sessions.ip_address, user_sessions.user_agent,
                    user_sessions.expires_at, users.name, users.email, users.role, users.commission_id, users.status
             FROM user_sessions
             INNER JOIN users ON users.id = user_sessions.user_id
             WHERE ' . implode("\n               AND ", $where) . '
             LIMIT 1'
        );
        $statement->execute(array_merge([
            'user_id' => $userId,
        ], auth_session_token_params($rawToken)));
        $row = $statement->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $exception) {
        return;
    }

    if (!is_array($row) || ($row['status'] ?? '') !== 'active') {
        security_log_event('session_rejected', [
            'endpoint' => app_request_endpoint(),
        ], $userId);
        auth_destroy_php_session();

        return;
    }

    $storedIp = trim((string) ($row['ip_address'] ?? ''));
    $storedUserAgent = trim((string) ($row['user_agent'] ?? ''));

    if ($storedIp !== '' && $storedIp !== client_ip_address()) {
        security_log_event('session_ip_changed', [
            'stored_ip' => $storedIp,
            'current_ip' => client_ip_address(),
        ], $userId);
    }

    if ($storedUserAgent !== '' && $storedUserAgent !== client_user_agent()) {
        security_log_event('session_user_agent_changed', [
            'stored_user_agent' => $storedUserAgent,
            'current_user_agent' => client_user_agent(),
        ], $userId);
    }

    $_SESSION['auth_user'] = [
        'type' => 'user',
        'id' => (int) ($row['user_id'] ?? $userId),
        'name' => (string) ($row['name'] ?? ''),
        'email' => (string) ($row['email'] ?? ''),
        'role' => (string) ($row['role'] ?: 'user'),
        'commission_id' => isset($row['commission_id']) ? (int) $row['commission_id'] : null,
        'session_token' => $rawToken,
        'logged_at' => (string) ($user['logged_at'] ?? date('c')),
        'last_validated_at' => date('c'),
        'last_activity_touch' => (int) ($user['last_activity_touch'] ?? 0),
    ];

    auth_touch_persisted_session($userId, $rawToken);
}

function record_login_attempt(string $email, bool $success): void
{
    try {
        $columns = ['email', 'ip_address', 'success'];
        $values = [':email', ':ip_address', ':success'];
        $params = [
            'email' => $email,
            'ip_address' => client_ip_address(),
            'success' => $success ? 1 : 0,
        ];

        if (auth_table_has_column('login_attempts', 'normalized_email')) {
            $columns[] = 'normalized_email';
            $values[] = ':normalized_email';
            $params['normalized_email'] = mb_strtolower(trim($email));
        }

        if (auth_table_has_column('login_attempts', 'user_agent')) {
            $columns[] = 'user_agent';
            $values[] = ':user_agent';
            $params['user_agent'] = client_user_agent();
        }

        if (auth_table_has_column('login_attempts', 'endpoint')) {
            $columns[] = 'endpoint';
            $values[] = ':endpoint';
            $params['endpoint'] = app_request_endpoint();
        }

        if (auth_table_has_column('login_attempts', 'attempted_at')) {
            $columns[] = 'attempted_at';
            $values[] = 'NOW()';
        }

        $statement = db()->prepare(
            'INSERT INTO login_attempts (' . implode(', ', $columns) . ')
             VALUES (' . implode(', ', $values) . ')'
        );
        $statement->execute($params);
    } catch (Throwable $exception) {
        // No bloquea el login si el log falla.
    }
}

function write_access_log(?int $userId, string $actionType, ?string $targetTable = null, ?int $targetId = null, ?string $details = null): void
{
    try {
        $statement = db()->prepare(
            'INSERT INTO access_logs (user_id, action_type, target_table, target_id, details, ip_address)
             VALUES (:user_id, :action_type, :target_table, :target_id, :details, :ip_address)'
        );
        $statement->execute([
            'user_id' => $userId,
            'action_type' => $actionType,
            'target_table' => $targetTable,
            'target_id' => $targetId,
            'details' => $details,
            'ip_address' => client_ip_address(),
        ]);
    } catch (Throwable $exception) {
        // No bloquea el flujo si el log falla.
    }
}

function persist_user_session(int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $expiresAt = (new DateTimeImmutable('+' . auth_session_ttl_days() . ' days'))->format('Y-m-d H:i:s');

    $columns = ['user_id', 'session_token', 'ip_address', 'user_agent', 'expires_at'];
    $values = [':user_id', ':session_token', ':ip_address', ':user_agent', ':expires_at'];
    $params = [
        'user_id' => $userId,
        'session_token' => auth_hash_token($token),
        'ip_address' => client_ip_address(),
        'user_agent' => client_user_agent(),
        'expires_at' => $expiresAt,
    ];

    if (auth_table_has_column('user_sessions', 'last_activity_at')) {
        $columns[] = 'last_activity_at';
        $values[] = 'NOW()';
    }

    try {
        $statement = db()->prepare(
            'INSERT INTO user_sessions (' . implode(', ', $columns) . ')
             VALUES (' . implode(', ', $values) . ')'
        );
        $statement->execute($params);
    } catch (Throwable $exception) {
        // El login no debe romperse si la persistencia de sesiones aun no se ha migrado.
    }

    return $token;
}

function update_last_login(int $userId): void
{
    $statement = db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id');
    $statement->execute(['id' => $userId]);
}

function create_user_session(array $user): void
{
    session_regenerate_id(true);

    $token = persist_user_session((int) $user['id']);
    $_SESSION['auth_user'] = [
        'type' => 'user',
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'] ?: 'user',
        'commission_id' => isset($user['commission_id']) ? (int) $user['commission_id'] : null,
        'session_token' => $token,
        'logged_at' => date('c'),
        'last_activity_touch' => time(),
    ];
}

function auth_check_account_lockout(?array $user): ?array
{
    if ($user === null || !is_array($user)) {
        return null;
    }

    $lockedUntil = isset($user['account_locked_until']) ? $user['account_locked_until'] : null;
    
    if ($lockedUntil === null) {
        return null;
    }

    $lockedUntilTime = new DateTimeImmutable($lockedUntil);
    $now = new DateTimeImmutable('now');

    if ($lockedUntilTime > $now) {
        return [
            'locked' => true,
            'until' => $lockedUntilTime->format('c'),
            'retry_after_seconds' => (int) ($lockedUntilTime->getTimestamp() - $now->getTimestamp()),
        ];
    }

    return null;
}

function auth_record_failed_login_attempt(int $userId): void
{
    if (!auth_table_has_column('users', 'failed_login_attempts') || !auth_table_has_column('users', 'account_locked_until')) {
        return;
    }

    try {
        $failedAttempts = 0;
        $user = db()->prepare('SELECT failed_login_attempts FROM users WHERE id = :id LIMIT 1');
        $user->execute(['id' => $userId]);
        $row = $user->fetch(PDO::FETCH_ASSOC);

        if (is_array($row)) {
            $failedAttempts = (int) ($row['failed_login_attempts'] ?? 0) + 1;
        }

        $lockUntil = null;
        if ($failedAttempts >= 5) {
            // Lock account for 15 minutes after 5 failed attempts
            $lockUntil = (new DateTimeImmutable('now'))->modify('+15 minutes')->format('Y-m-d H:i:s');
        }

        $statement = db()->prepare(
            'UPDATE users 
             SET failed_login_attempts = :attempts,
                 account_locked_until = :locked_until,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $statement->execute([
            'attempts' => $failedAttempts,
            'locked_until' => $lockUntil,
            'id' => $userId,
        ]);

        if ($lockUntil !== null) {
            security_log_event('account_locked', [
                'failed_attempts' => $failedAttempts,
                'locked_until' => $lockUntil,
            ], $userId);
        }
    } catch (Throwable $exception) {
        // Non-blocking
    }
}

function auth_reset_failed_login_attempts(int $userId): void
{
    if (!auth_table_has_column('users', 'failed_login_attempts') || !auth_table_has_column('users', 'account_locked_until')) {
        return;
    }

    try {
        $statement = db()->prepare(
            'UPDATE users 
             SET failed_login_attempts = 0,
                 account_locked_until = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $statement->execute(['id' => $userId]);
    } catch (Throwable $exception) {
        // Non-blocking
    }
}

// Consolidated login_with_credentials: base implementation kept, duplicates removed.
function login_with_credentials(string $email, string $password): array
{
    $normalizedEmail = mb_strtolower(trim($email));
    $password = trim($password);

    try {
        $rules = [
            ['scope' => 'ip', 'max' => 5, 'window' => 600],
        ];

        if ($normalizedEmail !== '') {
            $rules[] = ['scope' => 'email', 'identifier' => $normalizedEmail, 'max' => 10, 'window' => 900];
        }

        rate_limit_enforce('login', $rules, [
            'endpoint' => '/login',
            'ip_address' => client_ip_address(),
        ]);
    } catch (RateLimitExceededException $exception) {
        return ['success' => false, 'message' => $exception->getMessage()];
    }

    if (!filter_var($normalizedEmail, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => t('errors.invalid_email')];
    }

    if ($password === '') {
        return ['success' => false, 'message' => t('errors.missing_password')];
    }

    $user = find_user_by_email($normalizedEmail);

    if ($user === null) {
        record_login_attempt($normalizedEmail, false);
        return ['success' => false, 'message' => t('errors.unknown_email')];
    }

    // Check account lockout
    $lockout = auth_check_account_lockout($user);
    if ($lockout !== null && $lockout['locked'] === true) {
        record_login_attempt($normalizedEmail, false);
        security_log_event('login_account_locked', [
            'retry_after_seconds' => $lockout['retry_after_seconds'],
        ], (int) $user['id']);
        return ['success' => false, 'message' => t('errors.account_locked')];
    }

    if (($user['status'] ?? 'active') !== 'active') {
        record_login_attempt($normalizedEmail, false);
        return ['success' => false, 'message' => t('errors.blocked')];
    }

    $storedPassword = (string) $user['password'];
    $isHash = password_get_info($storedPassword)['algo'] !== null;
    $verified = $isHash ? password_verify($password, $storedPassword) : hash_equals($storedPassword, $password);

    if (!$verified) {
        record_login_attempt($normalizedEmail, false);
        auth_record_failed_login_attempt((int) $user['id']);
        return ['success' => false, 'message' => t('errors.invalid_credentials')];
    }

    // Reset failed attempts on successful login
    auth_reset_failed_login_attempts((int) $user['id']);

    if (!$isHash || password_needs_rehash($storedPassword, PASSWORD_DEFAULT)) {
        $rehash = password_hash($password, PASSWORD_DEFAULT);
        $statement = db()->prepare('UPDATE users SET password = :password WHERE id = :id');
        $statement->execute([
            'password' => $rehash,
            'id' => $user['id'],
        ]);
    }

    update_last_login((int) $user['id']);
    create_user_session($user);
    record_login_attempt($normalizedEmail, true);
    write_access_log((int) $user['id'], 'login_success', 'users', (int) $user['id'], 'Inicio de sesion correcto');

    return ['success' => true, 'message' => null];
}


function register_user_account(string $name, string $email, string $password, string $passwordConfirmation): array
{
    try {
        rate_limit_enforce('register', [
            ['scope' => 'ip', 'max' => 3, 'window' => 3600],
        ], [
            'endpoint' => '/register',
            'ip_address' => client_ip_address(),
        ]);
    } catch (RateLimitExceededException $exception) {
        return ['success' => false, 'message' => $exception->getMessage()];
    }

    $normalizedName = normalize_user_name($name);
    if ($normalizedName === '') {
        return ['success' => false, 'message' => t('errors.missing_name')];
    }

    try {
        $normalizedName = normalize_user_name(app_validate_string($normalizedName, 'name', [
            'min' => 2,
            'max' => 100,
            'normalize_spaces' => true,
        ]));
    } catch (InvalidArgumentException $exception) {
        return ['success' => false, 'message' => t('errors.invalid_name')];
    }

    try {
        $normalizedEmail = app_validate_email($email);
    } catch (InvalidArgumentException $exception) {
        return ['success' => false, 'message' => t('errors.invalid_email')];
    }

    $password = trim($password);
    $passwordConfirmation = trim($passwordConfirmation);

    if ($password === '') {
        return ['success' => false, 'message' => t('errors.missing_password')];
    }

    if (mb_strlen($password) < 8) {
        return ['success' => false, 'message' => t('errors.password_too_short')];
    }

    if (!hash_equals($password, $passwordConfirmation)) {
        return ['success' => false, 'message' => t('errors.password_mismatch')];
    }

    if (find_user_by_email($normalizedEmail) !== null) {
        return ['success' => false, 'message' => t('errors.email_taken')];
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($hashedPassword)) {
        throw new RuntimeException('No se pudo generar el hash de la contrasena.');
    }

    $db = db();

    try {
        $db->beginTransaction();

        $statement = $db->prepare(
            'INSERT INTO users (name, email, password, role, status)
             VALUES (:name, :email, :password, :role, :status)'
        );
        $statement->execute([
            'name' => $normalizedName,
            'email' => $normalizedEmail,
            'password' => $hashedPassword,
            'role' => 'user',
            'status' => 'active',
        ]);

        $userId = (int) $db->lastInsertId();
        update_last_login($userId);
        create_user_session([
            'id' => $userId,
            'name' => $normalizedName,
            'email' => $normalizedEmail,
            'role' => 'user',
        ]);

        $db->commit();
    } catch (PDOException $exception) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }

        if ($exception->getCode() === '23000') {
            return ['success' => false, 'message' => t('errors.email_taken')];
        }

        throw $exception;
    } catch (Throwable $exception) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }

        throw $exception;
    }

    write_access_log($userId, 'register_success', 'users', $userId, 'Registro correcto y sesion iniciada');

    try {
        require_once __DIR__ . '/../core/telegram_repository.php';

        telegram_notify_new_user_registration([
            'id' => $userId,
            'name' => $normalizedName,
            'email' => $normalizedEmail,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    } catch (Throwable $exception) {
        if (function_exists('telegram_log_error_message')) {
            telegram_log_error_message('Excepcion inesperada notificando nuevo registro: ' . $exception->getMessage());
        } else {
            error_log('Telegram registration notification failed: ' . $exception->getMessage());
        }
    }

    return ['success' => true, 'message' => null];
}

function login_as_guest(): void
{
    session_regenerate_id(true);

    $guestName = t('guest_name');

    $_SESSION['auth_user'] = [
        'type' => 'guest',
        'id' => 0,
        'name' => $guestName,
        'email' => null,
        'role' => 'guest',
        'session_token' => null,
        'logged_at' => date('c'),
        'last_activity_touch' => time(),
    ];

    write_access_log(null, 'guest_access', null, null, 'Acceso de invitado');

    try {
        require_once __DIR__ . '/../core/telegram_repository.php';

        // Aviso no bloqueante: si Telegram falla, el invitado debe poder entrar igual.
        telegram_notify_new_guest_access([
            'name' => $guestName,
            'session_id' => session_id(),
            'access_at' => date('Y-m-d H:i:s'),
        ]);
    } catch (Throwable $exception) {
        if (function_exists('telegram_log_error_message')) {
            telegram_log_error_message('Excepcion inesperada notificando acceso invitado: ' . $exception->getMessage());
        } else {
            error_log('Telegram guest access notification failed: ' . $exception->getMessage());
        }
    }
}

function password_reset_ensure_table(): void
{
    static $done = false;

    if ($done) {
        return;
    }

    db()->exec(
        'CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NOT NULL,
            token CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_password_reset_token (token),
            KEY idx_password_reset_user (user_id),
            KEY idx_password_reset_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $done = true;
}

function app_request_origin(): string
{
    $scheme = app_is_https_request() ? 'https' : 'http';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');

    return $scheme . '://' . $host;
}

function app_reset_password_abs_url(string $token): string
{
    $base = rtrim(app_base_url(), '/');
    $path = ($base === '' ? '' : $base) . '/reset-password.php';

    return app_request_origin() . $path . '?' . http_build_query([
        'token' => $token,
        'lang' => current_language(),
    ]);
}

function send_password_reset_mail(string $to, string $subject, string $body): bool
{
    $from = 'Falles360 <noreply@falles360.local>';
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/plain; charset=UTF-8',
        'From: ' . $from,
    ];

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    return @mail($to, $encodedSubject, $body, implode("\r\n", $headers));
}

/**
 * @return array{success:bool, message:?string}
 */
function request_password_reset(string $email): array
{
    password_reset_ensure_table();

    try {
        $normalizedEmail = app_validate_email($email);
    } catch (InvalidArgumentException $exception) {
        return ['success' => false, 'message' => t('errors.invalid_email')];
    }

    $okResponse = ['success' => true, 'message' => t('login.recover_sent')];

    try {
        rate_limit_enforce('password_reset_request', [
            ['scope' => 'ip', 'max' => 5, 'window' => 1800],
            ['scope' => 'email', 'identifier' => $normalizedEmail, 'max' => 5, 'window' => 1800],
        ], [
            'endpoint' => '/password-reset',
            'ip_address' => client_ip_address(),
        ]);
    } catch (RateLimitExceededException $exception) {
        return $okResponse;
    }

    $user = find_user_by_email($normalizedEmail);

    if ($user === null || ($user['status'] ?? 'active') !== 'active') {
        return $okResponse;
    }

    $userId = (int) $user['id'];
    $token = bin2hex(random_bytes(32));
    $expiresAt = (new DateTimeImmutable('+2 hours'))->format('Y-m-d H:i:s');

    try {
        $db = db();
        $delete = $db->prepare('DELETE FROM password_reset_tokens WHERE user_id = :user_id');
        $delete->execute(['user_id' => $userId]);

        $insert = $db->prepare(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at)
             VALUES (:user_id, :token, :expires_at)'
        );
        $insert->execute([
            'user_id' => $userId,
            'token' => auth_hash_token($token),
            'expires_at' => $expiresAt,
        ]);
    } catch (Throwable $exception) {
        return ['success' => false, 'message' => t('errors.db')];
    }

    $link = app_reset_password_abs_url($token);
    $subject = t('login.recover_mail_subject');
    $body = t('login.recover_mail_body', ['link' => $link]);

    if (!send_password_reset_mail($normalizedEmail, $subject, $body)) {
        error_log('Password reset: mail() failed for ' . $normalizedEmail);
    }

    return $okResponse;
}

/**
 * @return array{user_id:int, email:string}|null
 */
function find_valid_password_reset(string $token): ?array
{
    password_reset_ensure_table();

    $token = strtolower(preg_replace('/[^a-f0-9]/', '', $token) ?? '');

    if (strlen($token) !== 64) {
        return null;
    }

    $statement = db()->prepare(
        'SELECT prt.user_id, prt.expires_at, u.email, u.status
         FROM password_reset_tokens prt
         INNER JOIN users u ON u.id = prt.user_id
         WHERE prt.token = :token
         LIMIT 1'
    );
    $statement->execute(['token' => auth_hash_token($token)]);
    $row = $statement->fetch(PDO::FETCH_ASSOC);

    if ($row === false) {
        return null;
    }

    if (($row['status'] ?? '') !== 'active') {
        return null;
    }

    if (new DateTimeImmutable((string) $row['expires_at']) < new DateTimeImmutable()) {
        return null;
    }

    return [
        'user_id' => (int) $row['user_id'],
        'email' => (string) $row['email'],
    ];
}

/**
 * @return array{success:bool, message:?string}
 */
function reset_password_with_token(string $token, string $password, string $passwordConfirmation): array
{
    $row = find_valid_password_reset($token);

    if ($row === null) {
        return ['success' => false, 'message' => t('errors.reset_token_invalid')];
    }

    $password = trim($password);
    $passwordConfirmation = trim($passwordConfirmation);

    if ($password === '') {
        return ['success' => false, 'message' => t('errors.missing_password')];
    }

    if (mb_strlen($password) < 8) {
        return ['success' => false, 'message' => t('errors.password_too_short')];
    }

    if (!hash_equals($password, $passwordConfirmation)) {
        return ['success' => false, 'message' => t('errors.password_mismatch')];
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    if (!is_string($hashedPassword)) {
        return ['success' => false, 'message' => t('errors.db')];
    }

    $db = db();

    try {
        $db->beginTransaction();

        $update = $db->prepare('UPDATE users SET password = :password WHERE id = :id');
        $update->execute([
            'password' => $hashedPassword,
            'id' => $row['user_id'],
        ]);

        $revokeSessions = $db->prepare(
            'UPDATE user_sessions
             SET revoked_at = NOW(),
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = :id
               AND revoked_at IS NULL'
        );
        $revokeSessions->execute(['id' => $row['user_id']]);

        $purge = $db->prepare('DELETE FROM password_reset_tokens WHERE user_id = :id');
        $purge->execute(['id' => $row['user_id']]);

        $db->commit();
    } catch (Throwable $exception) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }

        return ['success' => false, 'message' => t('errors.db')];
    }

    write_access_log($row['user_id'], 'password_reset_complete', 'users', $row['user_id'], 'Contrasena restablecida');

    return ['success' => true, 'message' => t('login.reset_success')];
}

function logout_current_user(): void
{
    $user = current_user();

    auth_revoke_persisted_session(isset($user['session_token']) ? (string) $user['session_token'] : null);

    write_access_log(
        isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
        'logout',
        null,
        null,
        'Cierre de sesion'
    );

    auth_destroy_php_session();
}

function app_run_security_housekeeping(): void
{
    static $ran = false;

    if ($ran || app_is_cli()) {
        return;
    }

    $ran = true;

    if (random_int(1, 100) !== 1) {
        return;
    }

    try {
        db()->exec(
            'DELETE FROM user_sessions
             WHERE expires_at < (NOW() - INTERVAL 7 DAY)
                OR (revoked_at IS NOT NULL AND revoked_at < (NOW() - INTERVAL 7 DAY))'
        );
        db()->exec(
            'DELETE FROM password_reset_tokens
             WHERE expires_at < (NOW() - INTERVAL 1 DAY)'
        );
        db()->exec(
            'DELETE FROM login_attempts
             WHERE attempted_at < (NOW() - INTERVAL 180 DAY)'
        );
    } catch (Throwable $exception) {
        // Ignorado.
    }

    rate_limit_prune();
}
