# Schichtplaner

[![CI](https://github.com/Eric-Schubert/Shiftplan/actions/workflows/ci.yml/badge.svg)](https://github.com/Eric-Schubert/Shiftplan/actions/workflows/ci.yml)
![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js)
![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-3.x-003B57?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-yellow)

A browser-based shift planner for small and mid-sized teams. The app works week by week, supports fixed rotation patterns, and lets planners maintain schedules directly in the browser.

## Features

- Weekly planning with calendar weeks, public holidays, and school holidays
- Rotation patterns with a start week, cycle length, and template weeks
- Excel template export and import for rotation planning
- Staff, shift, and rotation management
- Planner role for shift assignments without full admin access
- Admin area for users, master data, and settings
- Audit log for manual schedule changes
- Automated releases, changelog generation, and Docker image publishing via GitHub Actions

## Quick Start

Requirements:

- Node.js 20+
- npm

```bash
npm install
npm run dev
```

The app starts at `http://localhost:3000`.

Set a bootstrap password before the first start:

```powershell
$env:SHIFTPLAN_ADMIN_PASSWORD = "SecurePassword1"
npm run dev
```

Change this password after the first login.
The setup creates the initial `admin` user. Predictable defaults such as `admin/admin` are not generated. If an existing database still contains an unchanged default admin, startup is blocked until `SHIFTPLAN_ADMIN_PASSWORD` is set and `node setup.js` is run again.

## Backend Configuration

Non-secret backend settings live in `config/backend.config.json`. This includes holiday regions, school holiday regions, session duration, rate limits, validation limits, shift defaults, analytics retention, XLSX limits, and proxy-header trust.

Secrets intentionally stay in `.env`, for example `SHIFTPLAN_ADMIN_PASSWORD` or Microsoft Graph credentials. Use `SHIFTPLAN_BACKEND_CONFIG_PATH` to load a different backend config file.

Proxy headers such as `x-forwarded-for` are ignored by default so clients cannot spoof their IP address to bypass rate limits. Set `auth.trustProxyHeaders` to `true` only when the app runs behind a trusted reverse proxy that overwrites these headers.

Holiday example:

```json
{
  "holidays": {
    "public": {
      "subdivisionCodes": ["SN"]
    },
    "school": {
      "defaultSubdivisionCodes": ["SN", "BB"]
    }
  }
}
```

## Docker

```bash
docker build -t schichtplaner .
docker run --rm -p 3000:3000 --env-file .env -e SHIFTPLAN_ADMIN_PASSWORD=SecurePassword1 -v ${PWD}/db:/app/db schichtplaner
```

Docker Compose starts the published image using the included `compose.yaml`:

```bash
docker compose up -d
```

The local `.env` file is not copied into the image. Pass it at runtime with `--env-file .env` or with `env_file` in Docker Compose so imprint and runtime variables are available inside the container. Compose reads `.env` for YAML interpolation, but it only passes values to the container when `env_file` is configured.
The Compose file mounts `./config/backend.config.json` to `/app/config/backend.config.json` so backend settings can be changed without rebuilding the image.

Release images are pushed to GHCR:

```text
ghcr.io/eric-schubert/shiftplan:latest
ghcr.io/eric-schubert/shiftplan:<version>
```

## Contact Email

Contact requests are stored locally and can be reviewed in the admin area. Optionally, the server can also send a Microsoft Graph notification to an Exchange Online mailbox.

Required `.env` values:

```env
CONTACT_MAIL_PROVIDER=graph
CONTACT_MAIL_TO=ziel@example.com
CONTACT_MAIL_GRAPH_TENANT_ID=
CONTACT_MAIL_GRAPH_CLIENT_ID=
CONTACT_MAIL_GRAPH_CLIENT_SECRET=
CONTACT_MAIL_GRAPH_FROM=postfach@example.com
CONTACT_MAIL_SUBJECT_PREFIX=[Schichtplaner]
CONTACT_MAIL_SAVE_TO_SENT_ITEMS=false
```

Create a Microsoft Entra app registration with the Microsoft Graph application permission `Mail.Send`, grant admin consent, and ideally restrict the app to the sending mailbox. Without these variables, the contact form still works and stores requests locally only.

## Roles

| Role | Can View | Can Plan | Can Manage |
|------|----------|----------|------------|
| Public | Weekly plan, shifts, rotation | No | No |
| Planner | Everything from the public view | Assign shifts, import/generate rotations | No |
| Admin | Everything | Everything | Users, staff, shifts, settings |

## Mobile API Auth

Browser clients use the default cookie session plus CSRF protection. Mobile clients can request an explicit bearer token by sending `responseMode: "token"` to the existing login endpoint:

```json
{
  "username": "planner",
  "password": "SecurePassword1",
  "responseMode": "token"
}
```

The response includes `tokenType: "Bearer"`, `sessionToken`, `expiresAt`, and the authenticated user. Mobile clients should send the token on subsequent requests as `Authorization: Bearer <sessionToken>`. Bearer-token requests do not need a CSRF token; cookie-based browser mutations still require CSRF.

## Rotation Planning With Excel

Planners and admins can maintain rotation patterns with an Excel file:

1. Download the Excel template in settings.
2. Read the instructions in the first sheet.
3. Check the start year, start week, and cycle length.
4. Fill or adjust the template weeks.
5. Import the file again.
6. Generate the shift plan from the new pattern.

Internal IDs are not exposed for editing in the template. The visible fields are designed so the file can be edited without technical knowledge.

## Development

```bash
npm run dev          # Development server
npm run test:run     # Run tests once
npm run build        # Production build
npm run docs         # Regenerate README sections
```

Important paths:

| Area | Path |
|------|------|
| Pages | `pages/` |
| Components | `components/` |
| Stores | `stores/` |
| Server API | `server/api/` |
| Services | `server/services/` |
| Tests | `tests/` |
| Release/README scripts | `scripts/` |

## Releases

Releases are created automatically from Conventional Commits. The currently visible and deploy-relevant prefixes are:

```text
feat:
fix:
perf:
security:
```

Hidden maintenance commits such as `docs:`, `test:`, `ci:`, or `chore:` do not create a release or Docker image.

The version history is available in the app through the version indicator in the header. New versions show only the newest entry on first visit; the full history remains available separately.

## Generated Details

The following sections are maintained by `scripts/readme-generator.js`. They are collapsed by default so the README stays readable first.

<details>
<summary>Show project structure</summary>

<!-- AUTO-GENERATED-STRUCTURE-START -->
```text
schichtplaner/
|-- components/
|   |-- app/
|   |   |-- ChangelogBanner.vue
|   |   `-- InstallBanner.vue
|   |-- planner/
|   |   |-- holiday/
|   |   |   |-- HolidayBannerCard.vue
|   |   |   |-- HolidayCompactList.vue
|   |   |   `-- HolidayDetailPanels.vue
|   |   |-- page/
|   |   |   |-- PlannerBulkGenerateDialog.vue
|   |   |   |-- PlannerCurrentWeekSection.vue
|   |   |   `-- PlannerWeekHero.vue
|   |   |-- shift/
|   |   |   |-- ShiftAssignDialog.vue
|   |   |   `-- ShiftAssigneeList.vue
|   |   |-- HolidayInfo.vue
|   |   |-- ShiftCard.vue
|   |   `-- WeekPreview.vue
|   |-- prime/
|   |   |-- PrimeCheckbox.vue
|   |   |-- PrimeColumn.vue
|   |   |-- PrimeDataTable.vue
|   |   |-- PrimeInputNumber.vue
|   |   |-- PrimeInputText.vue
|   |   |-- PrimeSelect.vue
|   |   |-- PrimeTab.vue
|   |   |-- PrimeTabList.vue
|   |   |-- PrimeTabPanel.vue
|   |   |-- PrimeTabPanels.vue
|   |   |-- PrimeTabs.vue
|   |   |-- PrimeTag.vue
|   |   `-- PrimeTextarea.vue
|   `-- settings/
|       |-- analytics/
|       |   `-- VisitAnalytics.vue
|       |-- audit/
|       |   `-- AuditLog.vue
|       |-- auth/
|       |   |-- AdminLogin.vue
|       |   `-- ChangePasswordDialog.vue
|       |-- contact/
|       |   `-- ContactMessages.vue
|       |-- rotation/
|       |   |-- RotationAssignDialog.vue
|       |   |-- RotationConfigDialog.vue
|       |   |-- RotationManager.vue
|       |   |-- RotationPatternBoard.vue
|       |   |-- RotationPatternIntro.vue
|       |   |-- RotationPatternWeekCard.vue
|       |   |-- RotationStaffPool.vue
|       |   |-- RotationToolbar.vue
|       |   |-- RotationWizardDialog.vue
|       |   |-- YearCopy.vue
|       |   |-- YearCopyDialog.vue
|       |   `-- YearCopyStatusPanel.vue
|       |-- shifts/
|       |   |-- ShiftDeleteDialog.vue
|       |   |-- ShiftFormDialog.vue
|       |   |-- ShiftManagementHeader.vue
|       |   |-- ShiftManagementList.vue
|       |   `-- ShiftManager.vue
|       |-- staff/
|       |   |-- StaffDeleteDialog.vue
|       |   |-- StaffFormDialog.vue
|       |   |-- StaffManagementHeader.vue
|       |   |-- StaffManagementList.vue
|       |   `-- StaffManager.vue
|       `-- users/
|           |-- UserCreateDialog.vue
|           |-- UserDeleteDialog.vue
|           |-- UserManagementHeader.vue
|           |-- UserManagementList.vue
|           `-- UserManager.vue
|-- layouts/
|   `-- default.vue
|-- pages/
|   |-- datenschutz.vue
|   |-- impressum.vue
|   |-- index.vue
|   `-- settings.vue
|-- scripts/
|   |-- create-release-tag.js
|   |-- docker-smoke-test.sh
|   |-- generate-changelog.js
|   |-- generate-readme.js
|   |-- readme-generator.js
|   |-- release-prefixes.json
|   |-- release-rules.js
|   `-- resolve-version.js
|-- server/
|   |-- api/
|   |   |-- analytics/
|   |   |   |-- index.get.ts
|   |   |   `-- visit.post.ts
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
|   |   |-- contact/
|   |   |   |-- messages/
|   |   |   |   `-- [id].patch.ts
|   |   |   `-- messages.get.ts
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
|   |   |-- staff/
|   |   |   |-- [id].delete.ts
|   |   |   |-- [id].get.ts
|   |   |   |-- [id].patch.ts
|   |   |   |-- index.get.ts
|   |   |   `-- index.post.ts
|   |   `-- contact.post.ts
|   |-- config/
|   |   |-- analytics-config.ts
|   |   |-- auth-config.ts
|   |   |-- backend-config.schema.ts
|   |   |-- backend-config.ts
|   |   |-- backend-config.types.ts
|   |   |-- contact-config.ts
|   |   |-- contact-mail-config.ts
|   |   |-- database-config.ts
|   |   |-- domain-config.ts
|   |   `-- holiday-config.ts
|   |-- middleware/
|   |   `-- auth.ts
|   |-- plugins/
|   |   `-- compression.ts
|   |-- services/
|   |   |-- analytics.service.ts
|   |   |-- audit.service.ts
|   |   |-- contact-mail.service.ts
|   |   |-- contact.service.ts
|   |   |-- rotation-excel.service.ts
|   |   |-- rotation.service.ts
|   |   |-- shift.service.ts
|   |   |-- shiftplan.service.ts
|   |   `-- staff.service.ts
|   `-- utils/
|       |-- analytics.ts
|       |-- auth.ts
|       |-- database-migrations.js
|       |-- database.ts
|       |-- session.ts
|       |-- validation.ts
|       `-- xlsx.ts
|-- stores/
|   |-- data/
|   |   |-- rotation.ts
|   |   |-- shared.ts
|   |   |-- shifts.ts
|   |   `-- staff.ts
|   |-- app.store.ts
|   |-- auth.store.ts
|   `-- data.store.ts
|-- types/
|   |-- analytics.ts
|   |-- auth.ts
|   |-- contact.ts
|   |-- holiday.ts
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
<summary>Show components</summary>

<!-- AUTO-GENERATED-COMPONENTS-START -->
*No components found.*
<!-- AUTO-GENERATED-COMPONENTS-END -->

</details>

<details>
<summary>Show API endpoints</summary>

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

### Analytics API

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `GET` | `/api/analytics` | Admin | No | `days` | - | List analytics records |
| `POST` | `/api/analytics/visit` | Authenticated | Yes | `path` | `path` | Create or update analytics data |

### Contact API

| Method | Endpoint | Access | CSRF | Query | Body | Description |
|--------|----------|--------|------|-------|------|-------------|
| `POST` | `/api/contact` | Authenticated | Yes | - | `company`, `message`, `name`, `replyTo`, `subject` | Create or update contact data |
| `GET` | `/api/contact/messages` | Admin | No | `limit`, `offset` | - | List contact records |
| `PATCH` | `/api/contact/messages/:id` | Admin | Yes | - | - | Update one contact record |
<!-- AUTO-GENERATED-API-END -->

</details>

<details>
<summary>Show access matrix</summary>

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
| `GET` | `/api/analytics` | No | No | Yes | No |
| `POST` | `/api/analytics/visit` | No | Yes | Yes | Yes |
| `POST` | `/api/contact` | No | Yes | Yes | Yes |
| `GET` | `/api/contact/messages` | No | No | Yes | No |
| `PATCH` | `/api/contact/messages/:id` | No | No | Yes | Yes |
<!-- AUTO-GENERATED-RBAC-END -->

</details>

<details>
<summary>Show CI, release, and Docker details</summary>

<!-- AUTO-GENERATED-WORKFLOWS-START -->
### Workflow Summary

| Workflow | Runs On | Main Result |
|----------|---------|-------------|
| CI | Push: master, main, RBA; PR: master/main | Tests, build, typecheck, and Docker smoke test |
| Auto Version & Release | Push: main, master | Creates version tag and GitHub release for changelog-visible commits |
| Docker Build & Push | CI success + deploy prefix: master, main, RBA | Builds and pushes GHCR image with generated changelog |
| Update README | Successful CI push: master, main | Regenerates README sections and commits with [skip ci] |

### Changelog Prefixes

Release and deploy prefix rules are defined in `scripts/release-prefixes.json`.

Visible in releases: `feat:`, `fix:`, `perf:`, `security:`

Hidden from releases: `refactor:`, `style:`, `test:`, `chore:`, `ci:`, `docs:`, `build:`, `revert:`

### Deploy Flow

1. CI validates tests, typecheck, and production build.
2. Auto Version & Release creates a tag for visible commit prefixes.
3. Docker waits for the release tag, generates the in-app changelog, and pushes the image.
4. Hidden prefixes such as docs, chore, ci, and test do not create releases or Docker images.
5. README automation updates generated documentation after trusted pushes without retriggering CI.
<!-- AUTO-GENERATED-WORKFLOWS-END -->

</details>

## License

MIT License. See [LICENSE](LICENSE) for details.
