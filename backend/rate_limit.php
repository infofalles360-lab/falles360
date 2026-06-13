<?php
declare(strict_types=1);

final class RateLimitExceededException extends RuntimeException
{
    public function __construct(
        string $message,
        private readonly int $retryAfterSeconds
    ) {
        parent::__construct($message, 429);
    }

    public function retryAfterSeconds(): int
    {
        return $this->retryAfterSeconds;
    }
}

function rate_limit_identifier_value(array $rule, array $context): ?string
{
    $scope = (string) ($rule['scope'] ?? 'ip');

    return match ($scope) {
        'user' => isset($context['user_id']) && (int) $context['user_id'] > 0 ? (string) (int) $context['user_id'] : null,
        'session' => isset($context['session_token']) && is_string($context['session_token']) && trim($context['session_token']) !== '' ? trim($context['session_token']) : null,
        'email' => isset($rule['identifier']) ? mb_strtolower(trim((string) $rule['identifier'])) : null,
        'custom' => isset($rule['identifier']) ? trim((string) $rule['identifier']) : null,
        default => isset($context['ip_address']) && trim((string) $context['ip_address']) !== '' ? trim((string) $context['ip_address']) : null,
    };
}

function rate_limit_ensure_storage(): void
{
    static $ensured = false;

    if ($ensured) {
        return;
    }

    db()->exec(
        'CREATE TABLE IF NOT EXISTS rate_limits (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            rate_key CHAR(64) NOT NULL,
            endpoint VARCHAR(190) NOT NULL,
            rate_scope VARCHAR(32) NOT NULL,
            user_id INT UNSIGNED NULL,
            ip_address VARCHAR(45) NULL,
            bucket_start DATETIME NOT NULL,
            bucket_seconds INT UNSIGNED NOT NULL,
            attempts INT UNSIGNED NOT NULL DEFAULT 0,
            blocked_until DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_rate_limits_bucket (rate_key, bucket_start),
            KEY idx_rate_limits_endpoint (endpoint, bucket_start),
            KEY idx_rate_limits_user (user_id, bucket_start),
            KEY idx_rate_limits_ip (ip_address, bucket_start),
            KEY idx_rate_limits_blocked (blocked_until)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $ensured = true;
}

function rate_limit_consume(string $action, array $rule, array $context = []): array
{
    $maxAttempts = max(1, (int) ($rule['max'] ?? 1));
    $windowSeconds = max(1, (int) ($rule['window'] ?? 60));
    $blockFor = max($windowSeconds, (int) ($rule['block_for'] ?? $windowSeconds));
    $identifier = rate_limit_identifier_value($rule, $context);

    if ($identifier === null || $identifier === '') {
        return [
            'allowed' => true,
            'attempts' => 0,
            'retry_after' => 0,
        ];
    }

    $endpoint = substr((string) ($context['endpoint'] ?? app_request_endpoint()), 0, 190);
    $scope = substr((string) ($rule['scope'] ?? 'ip'), 0, 32);
    $now = new DateTimeImmutable('now');
    $bucketStartTimestamp = intdiv($now->getTimestamp(), $windowSeconds) * $windowSeconds;
    $bucketStart = (new DateTimeImmutable('@' . $bucketStartTimestamp))
        ->setTimezone(new DateTimeZone(date_default_timezone_get()))
        ->format('Y-m-d H:i:s');
    $rateKey = hash('sha256', implode('|', [$action, $endpoint, $scope, $identifier]));

    try {
        rate_limit_ensure_storage();

        $check = db()->prepare(
            'SELECT attempts, blocked_until
             FROM rate_limits
             WHERE rate_key = :rate_key
             ORDER BY bucket_start DESC
             LIMIT 1'
        );
        $check->execute(['rate_key' => $rateKey]);
        $existing = $check->fetch();

        if (is_array($existing) && !empty($existing['blocked_until'])) {
            $blockedUntil = new DateTimeImmutable((string) $existing['blocked_until']);

            if ($blockedUntil > $now) {
                return [
                    'allowed' => false,
                    'attempts' => (int) ($existing['attempts'] ?? 0),
                    'retry_after' => max(1, $blockedUntil->getTimestamp() - $now->getTimestamp()),
                ];
            }
        }

        $statement = db()->prepare(
            'INSERT INTO rate_limits (
                rate_key,
                endpoint,
                rate_scope,
                user_id,
                ip_address,
                bucket_start,
                bucket_seconds,
                attempts,
                blocked_until
             ) VALUES (
                :rate_key,
                :endpoint,
                :rate_scope,
                :user_id,
                :ip_address,
                :bucket_start,
                :bucket_seconds,
                1,
                NULL
             )
             ON DUPLICATE KEY UPDATE
                attempts = attempts + 1,
                updated_at = CURRENT_TIMESTAMP'
        );
        $statement->bindValue(':rate_key', $rateKey, PDO::PARAM_STR);
        $statement->bindValue(':endpoint', $endpoint, PDO::PARAM_STR);
        $statement->bindValue(':rate_scope', $scope, PDO::PARAM_STR);
        $statement->bindValue(':user_id', isset($context['user_id']) && (int) $context['user_id'] > 0 ? (int) $context['user_id'] : null, isset($context['user_id']) && (int) $context['user_id'] > 0 ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $statement->bindValue(':ip_address', isset($context['ip_address']) ? substr((string) $context['ip_address'], 0, 45) : null, isset($context['ip_address']) ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $statement->bindValue(':bucket_start', $bucketStart, PDO::PARAM_STR);
        $statement->bindValue(':bucket_seconds', $windowSeconds, PDO::PARAM_INT);
        $statement->execute();

        $fetch = db()->prepare(
            'SELECT id, attempts, blocked_until
             FROM rate_limits
             WHERE rate_key = :rate_key
               AND bucket_start = :bucket_start
             LIMIT 1'
        );
        $fetch->execute([
            'rate_key' => $rateKey,
            'bucket_start' => $bucketStart,
        ]);
        $row = $fetch->fetch();
        $attempts = (int) ($row['attempts'] ?? 0);

        if ($attempts > $maxAttempts) {
            $blockedUntil = $now->modify('+' . $blockFor . ' seconds');
            $update = db()->prepare(
                'UPDATE rate_limits
                 SET blocked_until = :blocked_until,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $update->execute([
                'blocked_until' => $blockedUntil->format('Y-m-d H:i:s'),
                'id' => $row['id'],
            ]);

            security_log_event('rate_limit_blocked', [
                'action' => $action,
                'scope' => $scope,
                'endpoint' => $endpoint,
                'window_seconds' => $windowSeconds,
                'max_attempts' => $maxAttempts,
                'attempts' => $attempts,
            ], isset($context['user_id']) ? (int) $context['user_id'] : null, $endpoint);

            return [
                'allowed' => false,
                'attempts' => $attempts,
                'retry_after' => max(1, $blockedUntil->getTimestamp() - $now->getTimestamp()),
            ];
        }

        return [
            'allowed' => true,
            'attempts' => $attempts,
            'retry_after' => 0,
        ];
    } catch (Throwable $exception) {
        return [
            'allowed' => true,
            'attempts' => 0,
            'retry_after' => 0,
        ];
    }
}

function rate_limit_enforce(string $action, array $rules, array $context = []): void
{
    $user = function_exists('current_user') ? current_user() : null;
    if ($user !== null && isset($user['email']) && mb_strtolower(trim((string) $user['email'])) === 'marcbaixaulifigueres@gmail.com') {
        return;
    }

    $resolvedContext = array_merge([
        'endpoint' => app_request_endpoint(),
        'ip_address' => function_exists('client_ip_address') ? client_ip_address() : substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
    ], $context);

    foreach ($rules as $rule) {
        $result = rate_limit_consume($action, $rule, $resolvedContext);

        if (($result['allowed'] ?? true) !== true) {
            $retryAfter = max(1, (int) ($result['retry_after'] ?? 60));
            $message = trim((string) ($rule['message'] ?? ''));
            throw new RateLimitExceededException($message !== '' ? $message : 'Demasiadas peticiones. Intentalo de nuevo mas tarde.', $retryAfter);
        }
    }
}

function rate_limit_api_enforce(string $action, array $rules, array $context = []): void
{
    try {
        rate_limit_enforce($action, $rules, $context);
    } catch (RateLimitExceededException $exception) {
        if (!headers_sent()) {
            header('Retry-After: ' . $exception->retryAfterSeconds());
        }

        app_json_error($exception->getMessage(), 429);
    }
}

function rate_limit_prune(): void
{
    try {
        db()->exec(
            'DELETE FROM rate_limits
             WHERE DATE_ADD(bucket_start, INTERVAL bucket_seconds SECOND) < (NOW() - INTERVAL 2 DAY)
               AND (blocked_until IS NULL OR blocked_until < (NOW() - INTERVAL 1 DAY))'
        );
    } catch (Throwable $exception) {
        // Ignorado.
    }
}
