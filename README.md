# Schichtplaner

Eine moderne Web-Anwendung zur Verwaltung von Schichtplänen für Mitarbeiter.

## Features

- 📅 **Wochenbasierte Schichtplanung** - Einfache Navigation zwischen Wochen
- 👥 **Mitarbeiterverwaltung** - Erstellen, Bearbeiten, Aktivieren/Deaktivieren
- ⏰ **Schichtenverwaltung** - Flexible Schichtdefinitionen mit Farben
- 🔄 **Auto-Rotation** - Automatische Zuweisung basierend auf Kalenderwoche
- 🌙 **Dark Mode** - Augenfreundliche Darstellung

## Tech Stack

- **Frontend**: Nuxt 3, Vue 3, PrimeVue, TailwindCSS
- **Backend**: Nitro Server
- **Datenbank**: SQLite (better-sqlite3)
- **State Management**: Pinia

## Installation

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Die Anwendung ist dann unter `http://localhost:3000` erreichbar.

## Projektstruktur

```
schichtplaner/
├── components/          # Vue Komponenten
│   ├── ShiftCard.vue   # Schicht-Anzeige mit Zuweisungen
│   ├── ShiftManager.vue # Schichten CRUD
│   └── StaffManager.vue # Mitarbeiter CRUD
├── layouts/            # Layout-Templates
├── pages/              # Seiten (Auto-Routing)
│   ├── index.vue      # Hauptansicht (Schichtplan)
│   └── settings.vue   # Einstellungen
├── server/
│   ├── api/           # REST API Endpoints
│   ├── services/      # Business Logic
│   └── utils/         # Hilfsfunktionen
├── stores/            # Pinia Stores
├── types/             # TypeScript Definitionen
└── setup.js           # Datenbank-Initialisierung
```

## API Endpoints

### Mitarbeiter
- `GET /api/staff` - Alle Mitarbeiter
- `POST /api/staff` - Neuer Mitarbeiter
- `GET /api/staff/:id` - Einzelner Mitarbeiter
- `PATCH /api/staff/:id` - Mitarbeiter aktualisieren
- `DELETE /api/staff/:id` - Mitarbeiter löschen

### Schichten
- `GET /api/shift` - Alle Schichten
- `POST /api/shift` - Neue Schicht
- `GET /api/shift/:id` - Einzelne Schicht
- `PATCH /api/shift/:id` - Schicht aktualisieren
- `DELETE /api/shift/:id` - Schicht löschen

### Schichtplan
- `GET /api/shiftplan?year=2024&week=1` - Wöchentlicher Plan
- `POST /api/shiftplan/generate` - Auto-Generierung
- `POST /api/shiftplan/assign` - Mitarbeiter zuweisen
- `POST /api/shiftplan/unassign` - Zuweisung entfernen

## Scripts

```bash
npm run dev      # Entwicklungsserver
npm run build    # Production Build
npm run preview  # Production Preview
```
