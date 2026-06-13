DELETE FROM password_reset_tokens
WHERE expires_at < (NOW() - INTERVAL 1 DAY);

DELETE FROM user_sessions
WHERE expires_at < (NOW() - INTERVAL 7 DAY)
   OR (revoked_at IS NOT NULL AND revoked_at < (NOW() - INTERVAL 7 DAY));

DELETE FROM rate_limits
WHERE DATE_ADD(bucket_start, INTERVAL bucket_seconds SECOND) < (NOW() - INTERVAL 2 DAY)
  AND (blocked_until IS NULL OR blocked_until < (NOW() - INTERVAL 1 DAY));

DELETE FROM login_attempts
WHERE attempted_at < (NOW() - INTERVAL 180 DAY);

DELETE FROM security_events
WHERE created_at < (NOW() - INTERVAL 180 DAY);
