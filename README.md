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
```
schichtplaner/
├── components/
│   ├── AdminLogin.vue
│   ├── ChangePasswordDialog.vue
│   ├── RotationManager.vue
│   ├── ShiftCard.vue
│   ├── ShiftManager.vue
│   ├── StaffManager.vue
│   └── WeekPreview.vue
├── layouts/
│   └── default.vue
├── pages/
│   ├── index.vue
│   └── settings.vue
├── server/
│   ├── api/
│   │   ├── auth/
│   │   ├── rotation/
│   │   ├── shift/
│   │   ├── shiftplan/
│   │   └── staff/
│   ├── services/
│   └── utils/
├── stores/
│   ├── app.store.ts
│   ├── auth.store.ts
│   └── data.store.ts
├── types/
├── scripts/
│   ├── generate-readme.js
│   └── pre-commit
├── nuxt.config.ts
├── package.json
├── tailwind.config.js
└── tsconfig.json
```
<!-- AUTO-GENERATED-STRUCTURE-END -->

### Components

<!-- AUTO-GENERATED-COMPONENTS-START -->
| Component | File | Description |
|-----------|------|-------------|
| `AdminLogin` | AdminLogin.vue | Login form for admin authentication |
| `ChangePasswordDialog` | ChangePasswordDialog.vue | Dialog for changing admin password |
| `RotationManager` | RotationManager.vue | Editor for rotation patterns |
| `ShiftCard` | ShiftCard.vue | Display card for a single shift |
| `ShiftManager` | ShiftManager.vue | CRUD interface for shifts |
| `StaffManager` | StaffManager.vue | CRUD interface for staff members |
| `WeekPreview` | WeekPreview.vue | Preview of upcoming weeks |
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

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/staff` | Get all staff members |
| `GET` | `/api/staff/:id` | Get single staff member |
| `POST` | `/api/staff` | Create staff member |
| `PATCH` | `/api/staff/:id` | Update staff member |
| `DELETE` | `/api/staff/:id` | Delete staff member |

### Shift API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/shift` | Get all shifts |
| `GET` | `/api/shift/:id` | Get single shift |
| `POST` | `/api/shift` | Create shift |
| `PATCH` | `/api/shift/:id` | Update shift |
| `DELETE` | `/api/shift/:id` | Delete shift |

### Shiftplan API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/shiftplan?year=&week=` | Get weekly plan |
| `POST` | `/api/shiftplan/assign` | Assign staff to shift |
| `POST` | `/api/shiftplan/unassign` | Remove assignment |
| `POST` | `/api/shiftplan/generate` | Generate from pattern |

### Rotation API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/rotation` | Get complete pattern |
| `GET` | `/api/rotation/config` | Get configuration |
| `PATCH` | `/api/rotation/config` | Update configuration |
| `POST` | `/api/rotation/assign` | Add to pattern |
| `POST` | `/api/rotation/unassign` | Remove from pattern |

### Auth API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/change-password` | Change password |
<!-- AUTO-GENERATED-API-END -->

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

This README uses auto-generated sections. To update them:

```bash
# Manual update
npm run docs

# Automatic updates on every commit
npm run setup-hooks
```

### Markers

The following markers are used for auto-generation:

| Section | Start Marker | End Marker |
|---------|--------------|------------|
| Structure | `<!-- AUTO-GENERATED-STRUCTURE-START -->` | `<!-- AUTO-GENERATED-STRUCTURE-END -->` |
| Components | `<!-- AUTO-GENERATED-COMPONENTS-START -->` | `<!-- AUTO-GENERATED-COMPONENTS-END -->` |
| API | `<!-- AUTO-GENERATED-API-START -->` | `<!-- AUTO-GENERATED-API-END -->` |

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
