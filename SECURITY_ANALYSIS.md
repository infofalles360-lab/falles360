# Falles360 Project - Complete Security & Structure Analysis

## 1. PROJECT DIRECTORY STRUCTURE

### Root Level Organization
`
falles360/
├── backend/                    # PHP backend framework
├── frontend/
│   ├── app/                   # Public-facing app (falla.php, index.php)
│   ├── views/                 # PHP template views
│   └── dashboard/             # Admin dashboard (React/TypeScript)
├── api/                       # API endpoints
├── core/                      # Core business logic
├── config/                    # Configuration files
├── public/                    # Static assets (CSS, JS, icons)
├── scripts/                   # Utility scripts
└── middleware/                # Actions for auth/business logic
`

### Key Directories Breakdown:

**backend/** - Backend infrastructure
- authentication: session.php, auth.php
- security: security.php, csrf.php, rate_limit.php
- database: database.php, config.php
- validation: validation.php, i18n.php
- migrations: SQL schema files (*.sql)
- seeds: Demo data scripts (seed_*.php)
- utilities: Telegram sync, Cendra sync, CLI commands
- runtime: Session storage, temporary data

**api/** - REST API Endpoints (32 PHP files)
- Public: profile.php, favorites.php, fallas.php, events.php, me.php, cendra.php
- Activity: activity/event.php (tracking)
- Gamification: 10 gamification endpoints
- Admin: cendra/sync, telegram/send, status endpoints
- Map: heat.php (heatmap data)
- Telegram: webhooks, notifications

**core/** - Business Logic & Repositories
- bootstrap.php: Main initialization
- repository files: dashboard_repository.php, gamification_repository.php, cendra_repository.php
- helpers.php, models, services
- Map and heatmap logic

**dashboard/** - React/TypeScript Admin Interface
- src/: React components, utilities, hooks
- server/: Node.js backend for dashboard (Express)
- vite.config.ts: Build configuration
- Telegram integration server-side

**config/** - Configuration Delegates
- app.php: Application settings
- database.php: Database configuration

---

## 2. CONFIGURATION FILES ANALYSIS

### vite.config.ts (Root)
