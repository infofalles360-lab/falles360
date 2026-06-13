FALLES360 - Complete Directory Tree
====================================

C:\xampp\htdocs\fallasgo\falles360\
│
├── .env.example                          [Database & Telegram config template]
├── .gitignore                            [Excludes: node_modules, .env, sessions]
├── .htaccess                             [Apache configuration]
├── vite.config.ts                        [Root Vite build config]
├── tsconfig.json                         [TypeScript configuration]
├── package.json                          [Root dependencies]
├── README.md
│
├── backend/                              [PHP Backend Framework]
│   ├── auth.php (848 lines)              [Authentication, sessions, password reset]
│   ├── session.php (59 lines)            [Session initialization & config]
│   ├── security.php (289 lines)          [Security headers, CSP, logging]
│   ├── rate_limit.php (212 lines)        [Rate limiting system]
│   ├── csrf.php (126 lines)              [CSRF protection]
│   ├── database.php (43 lines)           [PDO database connection]
│   ├── config.php (103 lines)            [Environment variable loader]
│   ├── validation.php                    [Input validation functions]
│   ├── bootstrap.php (18 lines)          [Initialization chain]
│   ├── i18n.php                          [Internationalization]
│   ├── migrations/                       [Database schema migrations]
│   │   ├── 20260331_create_cendra_sync_runs.sql
│   │   ├── 20260407_create_gamification_module.sql
│   │   ├── 20260412_create_activity_events.sql
│   │   ├── 20260412_password_reset_tokens.sql
│   │   ├── 20260421_revoke_active_sessions.sql
│   │   ├── 20260421_security_cleanup.sql
│   │   └── 20260421_security_hardening.sql  [Main security hardening]
│   ├── runtime/
│   │   ├── sessions/                     [Session file storage]
│   │   └── cendra-periodic-review.json   [Temporary data]
│   ├── seed_demo_user.php
│   ├── seed_gamification_badges.php
│   ├── seed_gamification_demo.php
│   ├── run_cendra_sync.php
│   ├── run_telegram_update_drain.cmd
│   └── [Other utility scripts]
│
├── core/                                 [Business Logic & Repositories]
│   ├── bootstrap.php
│   ├── helpers.php                       [Utility functions]
│   ├── cendra_repository.php
│   ├── cendra_sync_repository.php
│   ├── dashboard_repository.php          [Admin dashboard data access]
│   ├── public_app_repository.php
│   ├── telegram_repository.php
│   ├── gamification_catalog.php
│   ├── gamification_models.php
│   ├── gamification_repository.php
│   ├── gamification_service.php
│   └── map_heat_repository.php
│
├── config/                               [Configuration Delegates]
│   ├── app.php                           [App settings]
│   └── database.php                      [Database config]
│
├── api/                                  [32 REST API Endpoints]
│   ├── profile.php                       [GET/POST - User profile]
│   ├── favorites.php                     [GET/POST - Manage favorites]
│   ├── fallas.php                        [GET - Fallas listing]
│   ├── events.php                        [GET - Events listing]
│   ├── me.php                            [GET - Current user]
│   ├── cendra.php                        [GET - Cendra content]
│   │
│   ├── activity/
│   │   └── event.php                     [POST - Track activity events]
│   │
│   ├── gamification/                     [10 endpoints]
│   │   ├── stats.php
│   │   ├── badges.php
│   │   ├── user-badges.php
│   │   ├── activity.php
│   │   ├── profile.php
│   │   ├── route-complete.php
│   │   ├── content-view.php
│   │   ├── navigation.php
│   │   ├── visit.php
│   │   ├── zones.php
│   │   └── bootstrap.php
│   │
│   ├── admin/                            [7 admin endpoints]
│   │   ├── cendra/
│   │   │   ├── sync.php
│   │   │   ├── status.php
│   │   │   ├── daily-summary.php
│   │   │   ├── publish-article.php
│   │   │   └── send-article-to-me.php
│   │   └── telegram/
│   │       └── send.php
│   │
│   ├── map/
│   │   └── heat.php                      [Heatmap data]
│   │
│   └── telegram/                         [5 endpoints]
│       ├── webhook.php
│       ├── notify.php
│       ├── status.php
│       ├── link-token.php
│       └── media.php
│
├── app/                                  [Public App Frontend]
│   ├── index.php                         [Main public app]
│   └── falla.php                         [Falla detail view]
│
├── actions/                              [Business Logic Actions]
│   └── auth/
│       └── logout.php
│
├── views/                                [PHP Template Views]
│   ├── admin/
│   │   ├── home.php
│   │   ├── logs.php
│   │   ├── profile.php
│   │   ├── resource.php
│   │   └── settings.php
│   ├── app/
│   │   ├── commission.php
│   │   └── guest.php
│   └── partials/
│       ├── dashboard_shell.php
│       └── home_showcase.php
│
├── dashboard/                            [React Admin Dashboard]
│   ├── vite.config.ts                    [Vite configuration for dashboard]
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.html
│   ├── .env.example                      [Env template - server vars only]
│   ├── .gitignore
│   ├── README.md
│   ├── metadata.json
│   │
│   ├── server/                           [Node.js Express server]
│   │   ├── index.mjs
│   │   ├── server.js
│   │   ├── telegram.js
│   │   ├── telegram-store.js
│   │   └── runtime/
│   │       └── telegram-store.json
│   │
│   ├── scripts/
│   │   └── dev.mjs
│   │
│   ├── src/                              [React/TypeScript source]
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── vite-env.d.ts
│   │   ├── assets/                       [SVG icons]
│   │   ├── components/                   [50+ React components]
│   │   │   ├── Header.tsx
│   │   │   ├── FallaCard.tsx
│   │   │   ├── FallaMap.tsx
│   │   │   ├── MapDashboardShowcase.tsx
│   │   │   ├── NavigationGuidanceOverlay.tsx
│   │   │   ├── TvMiniPlayer.tsx
│   │   │   ├── LiveTvChat.tsx
│   │   │   ├── ProfileSettingsModal.tsx
│   │   │   ├── gamification/             [10+ gamification components]
│   │   │   │   ├── GamificationProfilePanel.tsx
│   │   │   │   ├── BadgeGrid.tsx
│   │   │   │   ├── BadgeUnlockCelebration.tsx
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   ├── UnlockToast.tsx
│   │   │   │   └── [Others]
│   │   │   └── [Map, Navigation, Routing components]
│   │   ├── hooks/                        [React hooks]
│   │   │   ├── useGamification.ts
│   │   │   ├── useNavigationGuidance.ts
│   │   │   ├── useRouteData.ts
│   │   │   └── useUserLocation.ts
│   │   ├── utils/                        [Utility functions]
│   │   │   ├── security.ts
│   │   │   ├── mapHeat.ts
│   │   │   ├── activityHeat.ts
│   │   │   ├── gamification.ts
│   │   │   ├── navigation.ts
│   │   │   ├── telegram.ts
│   │   │   ├── cendra.ts
│   │   │   └── [Others]
│   │   ├── types/
│   │   │   └── leaflet.heat.d.ts
│   │   ├── data.ts
│   │   └── fallas-mock.ts
│   │
│   ├── dist/                             [Built files - excluded from git]
│   │   └── assets/
│   │
│   ├── node_modules/                     [Dependencies - excluded from git]
│   └── examples/
│       ├── connect-telegram.html
│       └── send-telegram-notification.js
│
├── public/                               [Static Assets]
│   ├── assets/
│   │   ├── css/
│   │   │   ├── app.css
│   │   │   └── dashboard.css
│   │   └── js/
│   │       ├── app-detail.js
│   │       ├── app-map.js
│   │       └── dashboard.js
│   ├── icons/
│   │   ├── apple-touch-icon.png
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── manifest.webmanifest
│   └── sw.js                             [Service worker]
│
├── src/                                  [Root React files]
│   ├── main.tsx
│   ├── App.tsx
│   ├── HeroIphoneFrame.tsx
│   ├── index.css
│   └── pwa.ts
│
├── scripts/                              [Utility Scripts]
│   └── backup-safe.ps1
│
├── login.php                             [Login/Register/Password reset page]
├── logout.php                            [Logout action]
├── reset-password.php                    [Password reset form]
├── index.php                             [Home page]
├── index.html                            [Frontend entry]
│
├── img/                                  [Badge/Trophy images]
├── node_modules/                         [Installed dependencies]
├── dist/                                 [Built frontend files]
├── public/                               [Static files]
│
├── metadata.json                         [App metadata]
├── package-lock.json                     [Dependency lock file]
└── [Temporary files: tmp-*.json, *.txt]


KEY SECURITY FILES
==================

Backend Security:
- backend/auth.php                        848 lines - Core authentication
- backend/session.php                     Session management
- backend/security.php                    289 lines - Headers & logging
- backend/rate_limit.php                  212 lines - Rate limiting
- backend/csrf.php                        126 lines - CSRF tokens
- backend/database.php                    PDO with security settings
- backend/bootstrap.php                   Initialization chain

Database Schema (Migrations):
- 20260421_security_hardening.sql         user_sessions, login_attempts, rate_limits, security_events
- 20260412_password_reset_tokens.sql      Password reset tokens
- 20260407_create_gamification_module.sql Gamification tables
- 20260412_create_activity_events.sql     Activity tracking

API Endpoints (32 total):
- Public: 6 endpoints
- Activity: 1 endpoint
- Gamification: 10 endpoints
- Admin: 7 endpoints
- Map: 1 endpoint
- Telegram: 5 endpoints

React Dashboard:
- 50+ components
- Leaflet mapping
- Gamification UI
- TV guide integration
- Telegram integration


DATABASE TABLES
===============

Security Tables:
- users (id, name, email, password, role, status, last_login_at)
- user_sessions (user_id, session_token, ip_address, expires_at, revoked_at)
- login_attempts (email, normalized_email, ip_address, success, attempted_at)
- rate_limits (rate_key, endpoint, bucket_start, attempts, blocked_until)
- security_events (event_type, endpoint, ip_address, user_agent, metadata_json)
- password_reset_tokens (user_id, token, expires_at)
- access_logs (user_id, action_type, target_table, ip_address)

Gamification Tables:
- gamification_profiles (xp_total, level_number, badges_unlocked)
- badges, user_badges, falla_visits
- gamification_routes, route_completions
- gamification_zones, user_activity_log
- xp_events, challenges, user_challenges

Data Tables:
- fallas (falla details)
- events (event listings)
- activity_events (tracking events)
- cendra_articles, cendra_sync_runs


DEPENDENCIES
============

Backend: PHP 7.4+, MySQL/MariaDB, PDO

Frontend (Node.js):
- React 19.0.0
- TypeScript
- Vite 6.2.0 (build tool)
- Tailwind CSS 4.1.14
- Leaflet (mapping)
- leaflet-routing-machine
- leaflet.heat
- HLS.js (video streaming)
- Express.js
- @google/genai
- dotenv

External APIs:
- Telegram Bot API
- Cendra Digital (content)
- Google Generative AI
- OpenRouter LLM


CONFIGURATION
=============

Main Config: backend/config.php
- Loads .env from multiple locations
- Returns ['db' => [...], 'app' => [...]]

Environment Variables:
- Database: FALLES_DB_HOST, PORT, NAME, USER, PASS
- Session: FALLES_SESSION_NAME, SAMESITE, TTL_DAYS, SAVE_PATH
- App: APP_URL
- Telegram: TELEGRAM_BOT_TOKEN, WEBHOOK_SECRET
- Cendra: CENDRA_SYNC_SOURCE_URL, LIMIT
- AI: OPENROUTER_API_KEY


MIGRATION CHAIN
===============

Database schema evolves through:
1. 20260331 - Cendra sync runs
2. 20260407 - Gamification module (10 tables)
3. 20260412 - Activity events + password reset tokens
4. 20260421 - Security hardening (main security tables + stored procedure)

Total tables created: 30+


SECURITY HEADERS
================

Applied by backend/security.php:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: Limited (geolocation, no camera/mic/payment/usb)
- Content-Security-Policy: Nonce-based scripts, restricted connect sources
- Removes X-Powered-By header


RATE LIMITING SCOPES
====================

Implemented in backend/rate_limit.php:
- 'ip' - By IP address
- 'user' - By authenticated user ID
- 'session' - By session token
- 'email' - By email address (for login attempts)
- 'custom' - Custom identifier

Default Limits:
- Login: 5 per IP/600s + 10 per email/900s
- Register: 3 per IP/3600s
- Password Reset: 5 per IP/1800s + 5 per email/1800s
- API endpoints: 20-30 per user/session/60s

