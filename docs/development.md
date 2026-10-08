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
```

CI fails when the generated docs are stale. After adding or changing an API route, run `npm run docs` and commit the result.

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
