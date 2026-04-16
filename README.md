# 🗓️ Schichtplaner (Shift Planner)

A modern, web-based shift planner with automatic rotation system for small to medium-sized teams.

[![CI](https://github.com/Eric-Schubert/Shiftplanv2/actions/workflows/ci.yml/badge.svg)](https://github.com/Eric-Schubert/Shiftplanv2/actions/workflows/ci.yml)
![Nuxt](https://img.shields.io/badge/Nuxt-3.x-00DC82?logo=nuxt.js)
![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-3.x-003B57?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### Core Functionality
- **Week-based shift planning** - Clear display per calendar week
- **Automatic rotation system** - Define patterns that repeat automatically
- **Staff management** - Full-time/part-time, active/inactive status
- **Shift management** - Flexible times, colors, minimum staffing
- **Bulk generation** - Create multiple weeks at once from pattern
- **Week preview** - Shows the next 3 weeks at a glance

### User Experience
- **Responsive design** - Optimized for desktop, tablet, and mobile
- **Dark mode** - Persistent setting (localStorage)
- **Real-time updates** - Changes visible immediately (Pinia Store)
- **German localization** - Calendar weeks according to ISO 8601
- **Saturday logic** - Automatically shows next week from Saturday onwards

### Security
- **Admin authentication** - Password-protected editing mode
- **Bcrypt hashing** - Secure password storage
- **Separate databases** - Admin credentials isolated from user data
- **Read mode for everyone** - Shift schedule publicly viewable

---

## 🏗️ Architecture

### Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Nuxt 3)                              │
├──────────────────────────────────────────────────────────────────────────┤
│  Pages            │   Components        │    Stores (Pinia)              │
│  ├─ index.vue     │   ├─ ShiftCard      │    ├─ app.store      (UI)      │
│  └─ settings.vue  │   ├─ StaffManager   │    ├─ auth.store   (Auth)      │
│                   │   ├─ ShiftManager   │    └─ data.store   (Data)      │
│                   │   ├─ RotationMgr    │                                │
│                   │   └─ WeekPreview    │                                │
├──────────────────────────────────────────────────────────────────────────┤
│                             API Layer (Nitro)                            │
│  /api/staff/*  │  /api/shift/*  │  /api/shiftplan/*  │  /api/auth/*      │
├──────────────────────────────────────────────────────────────────────────┤
│                           Services (Business Logic)                      │
│  StaffService  │  ShiftService  │  ShiftplanService  │  RotationService  │
├──────────────────────────────────────────────────────────────────────────┤
│                 Database (SQLite + better-sqlite3)                       │
│           db/db.sqlite (Data)    │    db/admin.sqlite (Auth)             │
└──────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

<!-- AUTO-GENERATED-STRUCTURE-START -->
```text
schichtplaner/
|-- components/
|   |-- AdminLogin.vue
|   |-- AuditLog.vue
|   |-- ChangelogBanner.vue
|   |-- ChangePasswordDialog.vue
|   |-- HolidayInfo.vue
|   |-- InstallBanner.vue
|   |-- RotationManager.vue
|   |-- ShiftCard.vue
|   |-- ShiftManager.vue
|   |-- StaffManager.vue
|   |-- UserManager.vue
|   |-- WeekPreview.vue
|   `-- YearCopy.vue
|-- layouts/
|   `-- default.vue
|-- pages/
|   |-- index.vue
|   `-- settings.vue
|-- scripts/
|   |-- docker-smoke-test.sh
|   |-- generate-changelog.js
|   |-- generate-readme.js
|   |-- readme-generator.js
|   `-- resolve-version.js
|-- server/
|   |-- api/
|   |   |-- audit/
|   |   |   `-- index.get.ts
|   |   |-- auth/
|   |   |   |-- users/
|   |   |   |   `-- [id].delete.ts
|   |   |   |-- change-password.post.ts
|   |   |   |-- login.post.ts
|   |   |   |-- logout.post.ts
|   |   |   |-- session.get.ts
|   |   |   |-- users.get.ts
|   |   |   `-- users.post.ts
|   |   |-- holidays/
|   |   |   |-- public.get.ts
|   |   |   `-- school.get.ts
|   |   |-- rotation/
|   |   |   |-- assign.post.ts
|   |   |   |-- config.get.ts
|   |   |   |-- config.patch.ts
|   |   |   |-- index.get.ts
|   |   |   `-- unassign.post.ts
|   |   |-- shift/
|   |   |   |-- [id].delete.ts
|   |   |   |-- [id].get.ts
|   |   |   |-- [id].patch.ts
|   |   |   |-- index.get.ts
|   |   |   `-- index.post.ts
|   |   |-- shiftplan/
|   |   |   |-- assign.post.ts
|   |   |   |-- copy-year.post.ts
|   |   |   |-- generate.post.ts
|   |   |   |-- index.get.ts
|   |   |   |-- unassign.post.ts
|   |   |   `-- year-summary.get.ts
|   |   `-- staff/
|   |       |-- [id].delete.ts
|   |       |-- [id].get.ts
|   |       |-- [id].patch.ts
|   |       |-- index.get.ts
|   |       `-- index.post.ts
|   |-- middleware/
|   |   `-- auth.ts
|   |-- services/
|   |   |-- audit.service.ts
|   |   |-- rotation.service.ts
|   |   |-- shift.service.ts
|   |   |-- shiftplan.service.ts
|   |   `-- staff.service.ts
|   `-- utils/
|       |-- auth.ts
|       |-- database-migrations.js
|       |-- database.ts
|       |-- session.ts
|       `-- validation.ts
|-- stores/
|   |-- app.store.ts
|   |-- auth.store.ts
|   `-- data.store.ts
|-- types/
|   |-- auth.ts
|   |-- rotation.ts
|   |-- shift.ts
|   |-- shiftplan.ts
|   `-- staff.ts
|-- components.d.ts
|-- nuxt.config.ts
|-- package.json
|-- README.md
|-- setup.js
|-- tailwind.config.js
|-- tsconfig.json
`-- vitest.config.ts
```
<!-- AUTO-GENERATED-STRUCTURE-END -->

### Components

<!-- AUTO-GENERATED-COMPONENTS-START -->
| Component | File | Description |
|-----------|------|-------------|
| `AdminLogin` | AdminLogin.vue | - |
| `AuditLog` | AuditLog.vue | - |
| `ChangePasswordDialog` | ChangePasswordDialog.vue | - |
| `ChangelogBanner` | ChangelogBanner.vue | ChangelogBanner Component |
| `HolidayInfo` | HolidayInfo.vue | HolidayInfo Component |
| `InstallBanner` | InstallBanner.vue | InstallBanner Component |
| `RotationManager` | RotationManager.vue | - |
| `ShiftCard` | ShiftCard.vue | Drag starten: Mitarbeiter-Chip wird gezogen |
| `ShiftManager` | ShiftManager.vue | - |
| `StaffManager` | StaffManager.vue | - |
| `UserManager` | UserManager.vue | - |
| `WeekPreview` | WeekPreview.vue | - |
| `YearCopy` | YearCopy.vue | - |
<!-- AUTO-GENERATED-COMPONENTS-END -->

---

## 🚀 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/Eric-Schubert/Shiftplanv2.git
cd Shiftplanv2

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Default Login

- **Password:** `admin`

### Reset Admin Password

```bash
# Delete the admin database
rm db/admin.sqlite

# Restart server - password will be reset to "admin"
npm run dev
```

---

## 📡 API Documentation

<!-- AUTO-GENERATED-API-START -->
### Staff API

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/staff` | Public | No | - | - | List staff records |
| `POST` | `/api/staff` | Admin | Yes | - | `active`, `is_parttime`, `name` | Create or update staff data |
| `GET` | `/api/staff/:id` | Public | No | - | - | Read one staff record |
| `PATCH` | `/api/staff/:id` | Admin | Yes | - | `active`, `is_parttime`, `name` | Update one staff record |
| `DELETE` | `/api/staff/:id` | Admin | Yes | - | - | Delete one staff record |

### Shift API

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/shift` | Public | No | - | - | List shift records |
| `POST` | `/api/shift` | Admin | Yes | - | `color`, `end_time`, `min_staff`, `name`, `sort_order`, `start_time` | Create or update shift data |
| `GET` | `/api/shift/:id` | Public | No | - | - | Read one shift record |
| `PATCH` | `/api/shift/:id` | Admin | Yes | - | `active`, `color`, `end_time`, `min_staff`, `name`, `sort_order`, `start_time` | Update one shift record |
| `DELETE` | `/api/shift/:id` | Admin | Yes | - | - | Delete one shift record |

### Shiftplan API

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/shiftplan` | Public | No | `week`, `year` | - | List shiftplan records |
| `POST` | `/api/shiftplan/assign` | Planner/Admin | Yes | - | `shift_id`, `staff_id`, `week`, `year` | Assign staff to a weekly shift |
| `POST` | `/api/shiftplan/copy-year` | Admin | Yes | - | `overwrite`, `sourceYear`, `targetYear` | Copy shift plans between years |
| `POST` | `/api/shiftplan/generate` | Admin | Yes | - | `week`, `weeks`, `year` | Generate plans from the rotation pattern |
| `POST` | `/api/shiftplan/unassign` | Planner/Admin | Yes | - | `shift_id`, `staff_id`, `week`, `year` | Remove staff from a weekly shift |
| `GET` | `/api/shiftplan/year-summary` | Public | No | `year` | - | Read yearly planning coverage |

### Rotation API

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/rotation` | Public | No | - | - | List rotation records |
| `POST` | `/api/rotation/assign` | Admin | Yes | - | `pattern_week`, `shift_id`, `staff_id` | Create or update rotation data |
| `GET` | `/api/rotation/config` | Public | No | - | - | List rotation records |
| `PATCH` | `/api/rotation/config` | Admin | Yes | - | `cycle_length`, `start_week`, `start_year` | Update one rotation record |
| `POST` | `/api/rotation/unassign` | Admin | Yes | - | `pattern_week`, `shift_id`, `staff_id` | Create or update rotation data |

### Auth API

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `POST` | `/api/auth/change-password` | Authenticated | Yes | - | `currentPassword`, `newPassword` | Change the current user's password |
| `POST` | `/api/auth/login` | Public | No | - | `password`, `username` | Create a session and CSRF token |
| `POST` | `/api/auth/logout` | Authenticated | Yes | - | - | Clear the current session |
| `GET` | `/api/auth/session` | Authenticated | No | - | - | Read the current session state |
| `GET` | `/api/auth/users` | Admin | No | - | - | List application users |
| `POST` | `/api/auth/users` | Admin | Yes | - | `password`, `role`, `username` | Create an application user |
| `DELETE` | `/api/auth/users/:id` | Admin | Yes | - | - | Delete an application user |

### Audit API

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/audit` | Admin | No | `limit`, `offset`, `week`, `year` | - | List audit log entries |

### Holidays API

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/holidays/public` | Public | No | `week`, `year` | - | Read public holidays |
| `GET` | `/api/holidays/school` | Public | No | `states`, `week`, `year` | - | Read school holidays |
<!-- AUTO-GENERATED-API-END -->

---

## Access Control

<!-- AUTO-GENERATED-RBAC-START -->
| Method | Endpoint | Public | Planner | Admin | CSRF |
|--------|----------|--------|---------|-------|------|
| `GET` | `/api/staff` | Yes | Yes | Yes | No |
| `POST` | `/api/staff` | No | No | Yes | Yes |
| `GET` | `/api/staff/:id` | Yes | Yes | Yes | No |
| `PATCH` | `/api/staff/:id` | No | No | Yes | Yes |
| `DELETE` | `/api/staff/:id` | No | No | Yes | Yes |
| `GET` | `/api/shift` | Yes | Yes | Yes | No |
| `POST` | `/api/shift` | No | No | Yes | Yes |
| `GET` | `/api/shift/:id` | Yes | Yes | Yes | No |
| `PATCH` | `/api/shift/:id` | No | No | Yes | Yes |
| `DELETE` | `/api/shift/:id` | No | No | Yes | Yes |
| `GET` | `/api/shiftplan` | Yes | Yes | Yes | No |
| `POST` | `/api/shiftplan/assign` | No | Yes | Yes | Yes |
| `POST` | `/api/shiftplan/copy-year` | No | No | Yes | Yes |
| `POST` | `/api/shiftplan/generate` | No | No | Yes | Yes |
| `POST` | `/api/shiftplan/unassign` | No | Yes | Yes | Yes |
| `GET` | `/api/shiftplan/year-summary` | Yes | Yes | Yes | No |
| `GET` | `/api/rotation` | Yes | Yes | Yes | No |
| `POST` | `/api/rotation/assign` | No | No | Yes | Yes |
| `GET` | `/api/rotation/config` | Yes | Yes | Yes | No |
| `PATCH` | `/api/rotation/config` | No | No | Yes | Yes |
| `POST` | `/api/rotation/unassign` | No | No | Yes | Yes |
| `POST` | `/api/auth/change-password` | No | Yes | Yes | Yes |
| `POST` | `/api/auth/login` | Yes | Yes | Yes | No |
| `POST` | `/api/auth/logout` | No | Yes | Yes | Yes |
| `GET` | `/api/auth/session` | No | Yes | Yes | No |
| `GET` | `/api/auth/users` | No | No | Yes | No |
| `POST` | `/api/auth/users` | No | No | Yes | Yes |
| `DELETE` | `/api/auth/users/:id` | No | No | Yes | Yes |
| `GET` | `/api/audit` | No | No | Yes | No |
| `GET` | `/api/holidays/public` | Yes | Yes | Yes | No |
| `GET` | `/api/holidays/school` | Yes | Yes | Yes | No |
<!-- AUTO-GENERATED-RBAC-END -->

---

## Automation

<!-- AUTO-GENERATED-WORKFLOWS-START -->
### Workflow Summary

| Workflow | Runs On | Main Result |
|----------|---------|-------------|
| CI | Push: master, main, RBA; PR: master/main | Tests, build, typecheck, and Docker smoke test |
| Auto Version & Release | Push: main, master | Creates version tag and GitHub release for changelog-visible commits |
| Docker Build & Push | CI success + deploy prefix: master, main, RBA | Builds and pushes GHCR image with generated changelog |
| Update README | CI success: master, main | Regenerates README sections and commits with [skip ci] |

### Changelog Prefixes

Visible in releases: `feat:`, `fix:`, `perf:`, `security:`

Hidden from releases: `refactor:`, `style:`, `test:`, `chore:`, `ci:`, `docs:`, `build:`, `revert:`

### Deploy Flow

1. CI validates tests, typecheck, and production build.
2. Auto Version & Release creates a tag for visible commit prefixes.
3. Docker waits for the release tag, generates the in-app changelog, and pushes the image.
4. Hidden prefixes such as docs, chore, ci, and test do not create releases or Docker images.
5. README automation updates generated documentation without retriggering CI.
<!-- AUTO-GENERATED-WORKFLOWS-END -->

---

## 🛠️ Scripts

```bash
# Development
npm run dev          # Start development server

# Build
npm run build        # Create production build
npm run preview      # Preview build

# Testing
npm run test         # Run tests
npm run test:watch   # Tests in watch mode

# Documentation
npm run docs         # Auto-update README.md
npm run setup-hooks  # Install git hooks for auto-updates
```

---

## 🌐 Production Deployment

### With PM2 (recommended)

```bash
# Build
npm run build

# Start with PM2
pm2 start .output/server/index.mjs --name "schichtplaner"

# Auto-start on system boot
pm2 startup
pm2 save
```

### With Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

```bash
# Build image
docker build -t schichtplaner .

# Run container
docker run -p 3000:3000 -v ./db:/app/db schichtplaner
```

### With nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name schichtplaner.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📝 Auto-Generated Documentation

This README uses auto-generated sections that update automatically via GitHub Actions.

The following sections are auto-generated:
- **Directory Structure** - Tree view of project files
- **Components** - List of Vue components
- **API Documentation** - All API endpoints
- **Access Control** - Route permissions and CSRF requirements
- **Automation** - CI, release, Docker, and README workflow summary

To manually update:
```bash
npm run docs
```

---

## 📋 Changelog

### v1.1.0
- Week preview showing next 3 weeks
- Saturday logic: Shows next week from Saturday onwards
- Compact UI layout
- Auto-generated README

### v1.0.0
- Initial release
- Week-based shift planning
- Rotation patterns
- Admin authentication

---

## 📄 License

MIT License - see [LICENSE](LICENSE)
