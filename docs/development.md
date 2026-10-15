# Development

## Local Setup

Requirements:

- Node.js 20+
- npm

```bash
npm install
SHIFTPLAN_ADMIN_PASSWORD=SecurePassword1 npm run dev
```

The app starts at `http://localhost:3000`. The password is only read on the first start, when the `admin` user is created. See [Configuration](configuration.md#admin-password).

## Commands

```bash
npm run dev          # Development server
npm run test:run     # Run tests once
npm run build        # Production build
npm run docs         # Regenerate the generated parts of docs/api.md and docs/releases.md
npm run lint:length  # Fail on source files over 150 lines (aim for about 100)
npm run lint:english # Fail on German comments, identifiers, test titles and log messages
```

CI fails when the generated docs are stale. After adding or changing an API route, run `npm run docs` and commit the result.

Code, comments, test titles and log messages are English; German UI text lives in strings only. `npm run lint:english` runs in CI and flags comments with umlauts or two German stopwords, identifiers with German stems (`kuerzel`, `firstKw`), German test titles and `console.*` messages. Quoted text such as „Früh“ is ignored, so comments can still name German UI labels. The public wire values `einladung`, `zugang`, `anfragen`, `urlaub`, `privat` and `sonstiges` stay allowed.

## Docker Image

```bash
docker build -t shiftplan .
docker run --rm -p 3000:3000 --env-file .env -e SHIFTPLAN_ADMIN_PASSWORD=SecurePassword1 -v ${PWD}/db:/app/db shiftplan
```

## Project Layout

| Area | Path |
|------|------|
| Pages | `pages/` |
| Components | `components/` |
| Stores | `stores/` |
| Server API | `server/api/` |
| Services | `server/services/` |
| Auth middleware | `server/middleware/auth.ts` |
| Backend config | `config/backend.config.json` |
| Tests | `tests/` |
| Release and docs scripts | `scripts/` |
| App API spec | `docs/api/app-v1.yaml` |
