# FALLES360 PROJECT - COMPLETE SECURITY & STRUCTURE AUDIT

## 1. PROJECT DIRECTORY TREE

### Root Organization
`
falles360/
  - Backend Layer: backend/, config/, core/
  - API Layer: api/ (32 endpoints)
  - Frontend: app/, views/, dashboard/ (React)
  - Utilities: actions/, scripts/
  - Static: public/, img/
`

### Backend Components
- auth.php (848 lines) - Auth, sessions, password reset
- session.php - Session configuration
- security.php (289 lines) - Headers, CSP, logging
- rate_limit.php (212 lines) - Rate limiting
- csrf.php (126 lines) - CSRF protection
- database.php - PDO connection
- config.php - Environment loading
- bootstrap.php - Initialization
- migrations/ (7 SQL files)
- runtime/sessions/ - Session storage

### API Endpoints (32 total)
- Public: profile, favorites, fallas, events, me, cendra
- Activity: activity/event.php
- Gamification: 10 endpoints
- Admin: cendra & telegram management (7 endpoints)
- Map: heat.php
- Telegram: webhooks, notifications (5 endpoints)

---

## 2. VITE CONFIGURATION

### Root vite.config.ts
- Base: './' (relative paths)
- Plugins: React, Tailwind CSS
- NO SECRET EXPOSURE

### dashboard/vite.config.ts
- Server proxy for /api
- loadEnv() reads .env files
- ENSURE: No secrets in client build

---

## 3. DATABASE SECURITY TABLES

### user_sessions
- session_token: CHAR(64) SHA256 hash
- expires_at: 30-day TTL
- revoked_at: For logout tracking
- ip_address, user_agent: For validation

### login_attempts
- normalized_email: Rate limiting index
- ip_address: IP-based rate limiting
- success: Boolean (0=fail, 1=success)
- Retention: 180 days

### rate_limits
- rate_key: SHA256 hash for uniqueness
- bucket_start: Time window
- attempts: Counter
- blocked_until: Block expiration
- Scopes: ip, user, session, email, custom

### security_events
- event_type: CSRF_failed, session_changed, etc.
- metadata_json: Context data
- Retention: 180 days

### password_reset_tokens
- token: CHAR(64) SHA256 hash
- expires_at: 2-hour TTL

---

## 4. SECURITY IMPLEMENTATIONS

### Authentication & Sessions
- session_regenerate_id(true) on login
- Token: bin2hex(random_bytes(32)) hashed with SHA256
- HTTP-only cookies with SameSite=Lax
- 30-day TTL (configurable)
- Validation on every request

### Password Security
- password_hash(PASSWORD_DEFAULT) = bcrypt
- Automatic rehash detection
- Minimum 8 characters

### Rate Limiting
- Multi-scope: IP, user, session, email
- Bucket-based time windows
- Login: 5 per IP/600s, 10 per email/900s
- Register: 3 per IP/3600s
- Password Reset: 5 per IP/1800s

### CSRF Protection
- Token: bin2hex(random_bytes(32))
- Storage: Session + HTTP-only cookie
- Validation: hash_equals() + origin check

### Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- CSP with nonce-based inline scripts

### Input Validation
- Prepared statements (PDO)
- Email, string, int, enum validation
- Coordinate validation
- 32KB JSON payload limit

### Logging
- access_logs: User actions
- security_events: CSRF, session, rate limit events
- login_attempts: Success/failure tracking

---

## 5. VULNERABILITIES IDENTIFIED

### CRITICAL
1. Session storage permissions: Set to 0700 not 0755
2. Email token delivery: Uses mail(), no TLS
3. Password reset schema: Migration token rehashing issue

### MEDIUM
4. IP address trust: No X-Forwarded-For checking
5. User-Agent change: Detected but not blocking
6. CSRF origin fallback: Allows if no origin/referer
7. Admin permissions: Simple role check, no granular control
8. Rate limiting failure: Returns allowed=true on DB error

### LOW
9. CSP allows unpkg.com external CDN
10. Security logging silently fails
11. Session activity touch: ±60 second accuracy

---

## 6. SECURITY BEST PRACTICES IMPLEMENTED

✓ Prepared statements (PDO)
✓ bcrypt password hashing
✓ HTTP-only cookies
✓ CSRF double-submit tokens
✓ Session token hashing
✓ Rate limiting on auth
✓ Security event logging
✓ Session cleanup (7 days)
✓ CSP with nonce scripts
✓ X-Frame-Options DENY
✓ Session regeneration
✓ IP/UA validation
✓ hash_equals() for tokens
✓ Input validation all endpoints
✓ Error obfuscation
✓ Secure random generation

---

## 7. MISSING FEATURES

✗ No HTTPS enforcement in code
✗ No multi-factor authentication
✗ No API key authentication
✗ No request signing
✗ No encryption at rest
✗ No admin audit trail
✗ No IP whitelist/blacklist
✗ No account lockout (only rate limiting)
✗ No suspicious activity alerts
✗ No brute force account lockout

---

## 8. RECOMMENDED HARDENING

IMMEDIATE:
- Fix session directory permissions (0700)
- Add account lockout after 3 failed attempts
- Implement SMTP with TLS for email
- Add HSTS header

SHORT-TERM:
- Add X-Forwarded-For support
- Implement admin audit trail
- Add 2FA/TOTP support

LONG-TERM:
- OAuth/SSO integration
- API key management
- Encryption at rest
- CSP violations logging

---

## 9. GITIGNORE QUALITY

Protected:
✓ node_modules/
✓ .env* files
✓ backups/
✓ backend/runtime/
✓ tmp-*.json

Assessment: Good coverage

---

## 10. DEPLOYMENT CHECKLIST

- Set .env database credentials
- Move sessions outside webroot
- Generate strong secrets
- Configure SMTP
- Enable HTTPS/TLS
- Set session permissions (0700)
- Run migrations
- Test rate limiting
- Verify CSP headers
- Audit admin users
- Test password reset email

---

## 11. TECH STACK

Backend: PHP 7.4+, PDO MySQL
Frontend: React 19, TypeScript, Vite, Tailwind CSS
Server: Node.js, Express
Database: MySQL/MariaDB (30+ tables)
External: Telegram API, Google AI, OpenRouter

---

## 12. STATISTICS

- PHP Files: 86
- API Endpoints: 32
- SQL Migrations: 7
- Core Functions: 600+
- Security Code: 627 lines
- Database Tables: 30+
- React Components: 50+
