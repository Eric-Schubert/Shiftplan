# Schichtplaner

[![CI](https://github.com/Eric-Schubert/Shiftplanv2/actions/workflows/ci.yml/badge.svg)](https://github.com/Eric-Schubert/Shiftplanv2/actions/workflows/ci.yml)
![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js)
![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-3.x-003B57?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-yellow)

Ein webbasierter Dienstplan fuer kleine und mittlere Teams. Der Plan laeuft wochenbasiert, unterstuetzt feste Schichtrotationen und laesst sich direkt im Browser pflegen.

## Was die App kann

- Wochenplan mit Kalenderwochen, Feiertagen und Schulferien
- Schichtrotation mit Startwoche, Zykluslaenge und Musterwochen
- Excel-Vorlage herunterladen, bearbeiten und wieder importieren
- Mitarbeiter, Schichten und Rotationsmuster verwalten
- Planer-Rolle fuer Schichtzuweisungen ohne volle Admin-Rechte
- Admin-Bereich fuer Benutzer, Stammdaten und Einstellungen
- Audit-Log fuer manuelle Aenderungen am Schichtplan
- Automatische Releases, Changelog und Docker-Image ueber GitHub Actions

## Schnellstart

Voraussetzungen:

- Node.js 20+
- npm

```bash
npm install
npm run dev
```

Die App startet lokal unter `http://localhost:3000`.

Standardzugang nach frischer Datenbank:

| Benutzer | Passwort | Rolle |
|----------|----------|-------|
| `admin` | `admin` | Admin |

Das Passwort sollte nach dem ersten Login geaendert werden.

## Docker

```bash
docker build -t schichtplaner .
docker run --rm -p 3000:3000 -v ${PWD}/db:/app/db schichtplaner
```

Aktuelle Images werden nach Releases nach GHCR gepusht:

```text
ghcr.io/eric-schubert/shiftplanv2:latest
ghcr.io/eric-schubert/shiftplanv2:<version>
```

## Rollen

| Rolle | Darf sehen | Darf planen | Darf verwalten |
|-------|------------|-------------|----------------|
| Öffentlich | Wochenplan, Schichten, Rotation | Nein | Nein |
| Planer | Alles aus der öffentlichen Ansicht | Schichten zuweisen, Rotation importieren/generieren | Nein |
| Admin | Alles | Alles | Benutzer, Mitarbeiter, Schichten, Einstellungen |

## Schichtrotation per Excel

Planer und Admins koennen die Rotation ueber eine Excel-Datei pflegen:

1. In den Einstellungen die Excel-Vorlage herunterladen.
2. Im ersten Blatt die Anleitung lesen.
3. Startjahr, Startwoche und Zykluslaenge pruefen.
4. Musterwochen befuellen oder anpassen.
5. Datei wieder importieren.
6. Schichtplan aus dem neuen Muster generieren.

Interne IDs werden in der Vorlage nicht zur Bearbeitung angezeigt. Die sichtbaren Felder sind so aufgebaut, dass die Datei auch ohne technisches Vorwissen bearbeitet werden kann.

## Entwicklung

```bash
npm run dev          # Entwicklungsserver
npm run test:run     # Tests einmalig ausfuehren
npm run build        # Produktionsbuild
npm run docs         # README-Abschnitte neu generieren
```

Wichtige Pfade:

| Bereich | Pfad |
|---------|------|
| Seiten | `pages/` |
| Komponenten | `components/` |
| Stores | `stores/` |
| Server-API | `server/api/` |
| Services | `server/services/` |
| Tests | `tests/` |
| Release/README-Skripte | `scripts/` |

## Releases

Releases entstehen automatisch aus Conventional Commits. Sichtbar und deploy-relevant sind aktuell:

```text
feat:
fix:
perf:
security:
```

Nicht sichtbare Wartungscommits wie `docs:`, `test:`, `ci:` oder `chore:` erzeugen kein Release und kein Docker-Image.

Der Versionsverlauf ist in der App ueber die Versionsanzeige im Header erreichbar. Neue Versionen zeigen beim ersten Besuch nur den neuesten Eintrag; der komplette Verlauf bleibt separat abrufbar.

## Automatisch generierte Details

Die folgenden Bereiche werden von `scripts/readme-generator.js` gepflegt. Sie sind absichtlich eingeklappt, damit die README zuerst lesbar bleibt.

<details>
<summary>Projektstruktur anzeigen</summary>

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
|   |-- release-prefixes.json
|   |-- release-rules.js
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
|   |   |   |-- excel-import.post.ts
|   |   |   |-- excel-template.get.ts
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
|   |   |-- rotation-excel.service.ts
|   |   |-- rotation.service.ts
|   |   |-- shift.service.ts
|   |   |-- shiftplan.service.ts
|   |   `-- staff.service.ts
|   `-- utils/
|       |-- auth.ts
|       |-- database-migrations.js
|       |-- database.ts
|       |-- session.ts
|       |-- validation.ts
|       `-- xlsx.ts
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

</details>

<details>
<summary>Komponenten anzeigen</summary>

<!-- AUTO-GENERATED-COMPONENTS-START -->
| Component | File | Description |
|-----------|------|-------------|
| `AdminLogin` | AdminLogin.vue | - |
| `AuditLog` | AuditLog.vue | - |
| `ChangePasswordDialog` | ChangePasswordDialog.vue | - |
| `ChangelogBanner` | ChangelogBanner.vue | - |
| `HolidayInfo` | HolidayInfo.vue | - |
| `InstallBanner` | InstallBanner.vue | InstallBanner Component |
| `RotationManager` | RotationManager.vue | - |
| `ShiftCard` | ShiftCard.vue | - |
| `ShiftManager` | ShiftManager.vue | - |
| `StaffManager` | StaffManager.vue | - |
| `UserManager` | UserManager.vue | - |
| `WeekPreview` | WeekPreview.vue | - |
| `YearCopy` | YearCopy.vue | - |
<!-- AUTO-GENERATED-COMPONENTS-END -->

</details>

<details>
<summary>API-Endpunkte anzeigen</summary>

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
| `POST` | `/api/shiftplan/copy-year` | Planner/Admin | Yes | - | `overwrite`, `sourceYear`, `targetYear` | Copy shift plans between years |
| `POST` | `/api/shiftplan/generate` | Planner/Admin | Yes | - | `week`, `weeks`, `year` | Generate plans from the rotation pattern |
| `POST` | `/api/shiftplan/unassign` | Planner/Admin | Yes | - | `shift_id`, `staff_id`, `week`, `year` | Remove staff from a weekly shift |
| `GET` | `/api/shiftplan/year-summary` | Public | No | `year` | - | Read yearly planning coverage |

### Rotation API

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/rotation` | Public | No | - | - | List rotation records |
| `POST` | `/api/rotation/assign` | Planner/Admin | Yes | - | `pattern_week`, `shift_id`, `staff_id` | Create or update rotation data |
| `GET` | `/api/rotation/config` | Public | No | - | - | List rotation records |
| `PATCH` | `/api/rotation/config` | Planner/Admin | Yes | - | `cycle_length`, `start_week`, `start_year` | Update one rotation record |
| `POST` | `/api/rotation/excel-import` | Planner/Admin | Yes | - | - | Create or update rotation data |
| `GET` | `/api/rotation/excel-template` | Planner/Admin | No | - | - | List rotation records |
| `POST` | `/api/rotation/unassign` | Planner/Admin | Yes | - | `pattern_week`, `shift_id`, `staff_id` | Create or update rotation data |

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

</details>

<details>
<summary>Zugriffsrechte anzeigen</summary>

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
| `POST` | `/api/shiftplan/copy-year` | No | Yes | Yes | Yes |
| `POST` | `/api/shiftplan/generate` | No | Yes | Yes | Yes |
| `POST` | `/api/shiftplan/unassign` | No | Yes | Yes | Yes |
| `GET` | `/api/shiftplan/year-summary` | Yes | Yes | Yes | No |
| `GET` | `/api/rotation` | Yes | Yes | Yes | No |
| `POST` | `/api/rotation/assign` | No | Yes | Yes | Yes |
| `GET` | `/api/rotation/config` | Yes | Yes | Yes | No |
| `PATCH` | `/api/rotation/config` | No | Yes | Yes | Yes |
| `POST` | `/api/rotation/excel-import` | No | Yes | Yes | Yes |
| `GET` | `/api/rotation/excel-template` | No | Yes | Yes | No |
| `POST` | `/api/rotation/unassign` | No | Yes | Yes | Yes |
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

</details>

<details>
<summary>CI, Release und Docker anzeigen</summary>

<!-- AUTO-GENERATED-WORKFLOWS-START -->
### Workflow Summary

| Workflow | Runs On | Main Result |
|----------|---------|-------------|
| CI | Push: master, main, RBA; PR: master/main | Tests, build, typecheck, and Docker smoke test |
| Auto Version & Release | Push: main, master | Creates version tag and GitHub release for changelog-visible commits |
| Docker Build & Push | CI success + deploy prefix: master, main, RBA | Builds and pushes GHCR image with generated changelog |
| Update README | CI success: master, main | Regenerates README sections and commits with [skip ci] |

### Changelog Prefixes

Release and deploy prefix rules are defined in `scripts/release-prefixes.json`.

Visible in releases: `feat:`, `fix:`, `perf:`, `security:`

Hidden from releases: `refactor:`, `style:`, `test:`, `chore:`, `ci:`, `docs:`, `build:`, `revert:`

### Deploy Flow

1. CI validates tests, typecheck, and production build.
2. Auto Version & Release creates a tag for visible commit prefixes.
3. Docker waits for the release tag, generates the in-app changelog, and pushes the image.
4. Hidden prefixes such as docs, chore, ci, and test do not create releases or Docker images.
5. README automation updates generated documentation without retriggering CI.
<!-- AUTO-GENERATED-WORKFLOWS-END -->

</details>

## Lizenz

MIT License. Details stehen in [LICENSE](LICENSE).
