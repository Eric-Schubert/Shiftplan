# 🗓️ Schichtplaner

Ein moderner, webbasierter Schichtplaner mit automatischem Rotationssystem für kleine bis mittlere Teams.

[![CI](https://github.com/Eric-Schubert/Shiftplanv2/actions/workflows/ci.yml/badge.svg)](https://github.com/Eric-Schubert/Shiftplanv2/actions/workflows/ci.yml)
![Nuxt](https://img.shields.io/badge/Nuxt-3.x-00DC82?logo=nuxt.js)
![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-3.x-003B57?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### Kernfunktionen
- **Wochenbasierte Schichtplanung** - Übersichtliche Darstellung pro Kalenderwoche
- **Automatisches Rotationssystem** - Definiere Muster, die sich automatisch wiederholen
- **Mitarbeiterverwaltung** - Vollzeit/Teilzeit, Aktiv/Inaktiv Status
- **Schichtverwaltung** - Flexible Zeiten, Farben, Mindestbesetzung
- **Bulk-Generierung** - Mehrere Wochen auf einmal aus Muster erstellen

### Benutzerfreundlichkeit
- **Responsive Design** - Optimiert für Desktop, Tablet und Mobile
- **Dark Mode** - Persistente Einstellung (localStorage)
- **Echtzeit-Updates** - Änderungen sofort sichtbar (Pinia Store)
- **Deutsche Lokalisierung** - Kalenderwochen nach ISO 8601

### Sicherheit
- **Admin-Authentifizierung** - Passwortgeschützter Bearbeitungsmodus
- **Bcrypt-Hashing** - Sichere Passwortspeicherung
- **Getrennte Datenbanken** - Admin-Credentials isoliert von Nutzdaten
- **Lesemodus für alle** - Schichtplan öffentlich einsehbar

---

## 🏗️ Architektur

### Übersicht

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Nuxt 3)                              │
├──────────────────────────────────────────────────────────────────────────┤
│  Pages            │   Components        │    Stores (Pinia)              │
│  ├─ index.vue     │   ├─ ShiftCard      │    ├─ app.store      (UI)      │
│  └─ settings      │   ├─ StaffManager   │    ├─ auth.store   (Auth)      │
│                   │   ├─ ShiftManager   │    └─ data.store   (Data)      │
│                   │   └─ RotationMgr    │                                │
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

### Verzeichnisstruktur

```
shiftplan/
├── components/              # Vue-Komponenten
│   ├── AdminLogin.vue       # Login-Formular
│   ├── ChangePasswordDialog.vue
│   ├── RotationManager.vue  # Rotationsmuster-Editor
│   ├── ShiftCard.vue        # Einzelne Schicht-Karte
│   ├── ShiftManager.vue     # Schichten CRUD
│   └── StaffManager.vue     # Mitarbeiter CRUD
├── layouts/
│   └── default.vue          # Haupt-Layout mit Header
├── pages/
│   ├── index.vue            # Hauptseite (Wochenansicht)
│   └── settings.vue         # Admin-Bereich
├── server/
│   ├── api/                 # REST API Endpoints
│   │   ├── auth/            # Login, Passwort ändern
│   │   ├── rotation/        # Rotationsmuster
│   │   ├── shift/           # Schichten CRUD
│   │   ├── shiftplan/       # Wochenplan, Zuweisungen
│   │   └── staff/           # Mitarbeiter CRUD
│   ├── services/            # Business Logic
│   │   ├── rotation.service.ts
│   │   ├── shift.service.ts
│   │   ├── shiftplan.service.ts
│   │   └── staff.service.ts
│   └── utils/
│       └── database.ts      # DB-Verbindungen
├── stores/                  # Pinia State Management
│   ├── app.store.ts         # UI State (Woche, Dark Mode)
│   ├── auth.store.ts        # Auth State (Session)
│   └── data.store.ts        # Daten (Staff, Shifts, Rotation)
├── types/                   # TypeScript Definitionen
│   ├── rotation.ts
│   ├── shift.ts
│   ├── shiftplan.ts
│   └── staff.ts
├── db/                      # SQLite Datenbanken (generiert)
│   ├── db.sqlite            # Nutzdaten
│   └── admin.sqlite         # Admin-Passwort
├── setup.js                 # DB-Initialisierung
├── nuxt.config.ts
├── package.json
└── tailwind.config.js
```

### Datenmodell

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    staff     │     │    shifts    │     │ rotation_config  │
├──────────────┤     ├──────────────┤     ├──────────────────┤
│ staff_id PK  │     │ shift_id PK  │     │ config_id PK     │
│ name         │     │ name         │     │ cycle_length     │
│ active       │     │ start_time   │     │ start_year       │
│ is_parttime  │     │ end_time     │     │ start_week       │
└──────┬───────┘     │ color        │     └──────────────────┘
       │             │ min_staff    │
       │             │ active       │
       │             │ sort_order   │
       │             └──────┬───────┘
       │                    │
       │    ┌───────────────┴───────────────┐
       │    │                               │
       ▼    ▼                               ▼
┌──────────────────────┐         ┌──────────────────────┐
│  shift_assignments   │         │   rotation_pattern   │
├──────────────────────┤         ├──────────────────────┤
│ assignment_id PK     │         │ pattern_id PK        │
│ week_id FK           │         │ pattern_week         │
│ staff_id FK          │         │ staff_id FK          │
│ shift_id FK          │         │ shift_id FK          │
└──────────┬───────────┘         └──────────────────────┘
           │
           ▼
    ┌──────────────┐
    │    weeks     │
    ├──────────────┤
    │ week_id PK   │
    │ year         │
    │ week_number  │
    └──────────────┘
```

---

## 🚀 Installation

### Voraussetzungen

- **Node.js** 20.x oder höher
- **npm** 10.x oder höher

### Lokale Entwicklung

```bash
# Repository klonen
git clone <repository-url>
cd shiftplan

# Dependencies installieren
npm install

# Entwicklungsserver starten (inkl. DB-Setup)
npm run dev
```

Die Anwendung ist nun unter `http://localhost:3000` erreichbar.

### Erster Start

Beim ersten Start werden automatisch:
1. Die Datenbanken erstellt (`db/db.sqlite`, `db/admin.sqlite`)
2. Demo-Daten eingefügt (5 Mitarbeiter, 3 Schichten)
3. Das Standard-Admin-Passwort gesetzt

> ⚠️ **Wichtig:** Ändere das Admin-Passwort sofort nach dem ersten Login!

---

## ⚙️ Konfiguration

### Umgebungsvariablen

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `PORT` | `3000` | Server-Port |
| `HOST` | `localhost` | Server-Host |

### Standard-Zugangsdaten

| Eigenschaft | Wert |
|-------------|------|
| **Admin-Passwort** | `admin` |

---

## 🔐 Sicherheit

### Authentifizierung

- Passwort-Hashing mit **bcryptjs** (Cost Factor: 10)
- Session-Timeout nach **30 Minuten** Inaktivität
- Passwort in separater Datenbank (`admin.sqlite`)

### Berechtigungen

| Aktion | Ohne Login | Mit Login |
|--------|------------|-----------|
| Schichtplan ansehen | ✅ | ✅ |
| Mitarbeiter zuweisen | ❌ | ✅ |
| Aus Muster generieren | ❌ | ✅ |
| Einstellungen öffnen | ❌ | ✅ |
| Mitarbeiter/Schichten verwalten | ❌ | ✅ |
| Rotationsmuster bearbeiten | ❌ | ✅ |

### Passwort zurücksetzen

Falls das Admin-Passwort vergessen wurde:

```bash
# Nur Admin-DB löschen (Nutzdaten bleiben erhalten!)
rm db/admin.sqlite

# Server neu starten - Passwort wird auf "admin" zurückgesetzt
npm run dev
```

---

## 📡 API-Dokumentation

### Staff API

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| `GET` | `/api/staff` | Alle Mitarbeiter |
| `GET` | `/api/staff/:id` | Einzelner Mitarbeiter |
| `POST` | `/api/staff` | Mitarbeiter erstellen |
| `PATCH` | `/api/staff/:id` | Mitarbeiter bearbeiten |
| `DELETE` | `/api/staff/:id` | Mitarbeiter löschen |

### Shift API

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| `GET` | `/api/shift` | Alle Schichten |
| `GET` | `/api/shift/:id` | Einzelne Schicht |
| `POST` | `/api/shift` | Schicht erstellen |
| `PATCH` | `/api/shift/:id` | Schicht bearbeiten |
| `DELETE` | `/api/shift/:id` | Schicht löschen |

### Shiftplan API

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| `GET` | `/api/shiftplan?year=&week=` | Wochenplan abrufen |
| `POST` | `/api/shiftplan/assign` | Mitarbeiter zuweisen |
| `POST` | `/api/shiftplan/unassign` | Zuweisung entfernen |
| `POST` | `/api/shiftplan/generate` | Aus Muster generieren |

### Rotation API

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| `GET` | `/api/rotation` | Komplettes Muster |
| `GET` | `/api/rotation/config` | Konfiguration |
| `PATCH` | `/api/rotation/config` | Konfiguration ändern |
| `POST` | `/api/rotation/assign` | Zum Muster hinzufügen |
| `POST` | `/api/rotation/unassign` | Aus Muster entfernen |

### Auth API

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| `POST` | `/api/auth/login` | Anmelden |
| `POST` | `/api/auth/change-password` | Passwort ändern |

---

## 🌐 Production Deployment

### Build erstellen

```bash
# Production Build
npm run build

# Vorschau des Builds
npm run preview
```

### Mit PM2 (empfohlen)

```bash
# PM2 installieren
npm install -g pm2

# Build erstellen
npm run build

# Mit PM2 starten
pm2 start .output/server/index.mjs --name "schichtplaner"

# Auto-Start bei Systemstart
pm2 startup
pm2 save
```

### Mit Docker

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
# Image bauen
docker build -t schichtplaner .

# Container starten
docker run -d -p 3000:3000 -v ./db:/app/db --name schichtplaner schichtplaner
```

### Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name schichtplan.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### HTTPS mit Certbot

```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx

# Zertifikat erstellen
sudo certbot --nginx -d schichtplan.example.com
```

---

## 🔧 Wartung

### Backup

```bash
# Datenbanken sichern
cp -r db/ backup/db-$(date +%Y%m%d)/
```

### Datenbank zurücksetzen

```bash
# Kompletter Reset (alle Daten werden gelöscht!)
rm -rf db/
npm run dev
```

### Logs (PM2)

```bash
# Logs anzeigen
pm2 logs schichtplaner

# Logs leeren
pm2 flush
```

---

## 🛠️ Technologie-Stack

| Komponente | Technologie | Version |
|------------|-------------|---------|
| **Frontend Framework** | Nuxt 3 | 3.15+ |
| **UI Framework** | Vue 3 | 3.5+ |
| **State Management** | Pinia | 2.3+ |
| **UI Components** | PrimeVue | 4.2+ |
| **Styling** | Tailwind CSS | 3.4+ |
| **Icons** | Nuxt Icon + MDI | - |
| **Backend** | Nitro (Nuxt) | - |
| **Datenbank** | SQLite | 3.x |
| **DB Driver** | better-sqlite3 | 11.7+ |
| **Passwort-Hashing** | bcryptjs | 2.4+ |
| **Sprache** | TypeScript | 5.x |

---

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE)
