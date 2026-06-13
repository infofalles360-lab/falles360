UPDATE user_sessions
SET revoked_at = NOW(),
    updated_at = CURRENT_TIMESTAMP
WHERE revoked_at IS NULL
  AND expires_at >= NOW();
