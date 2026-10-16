# Development

## Local Setup

Requirements:

- Node.js 24 (the version CI and the Docker image use, see `.nvmrc`)
- npm

```bash
npm install
SHIFTPLAN_ADMIN_PASSWORD=SecurePassword1 npm run dev
```

The app starts at `http://localhost:3000`. The password is only read on the first start, when the `admin` user is created. See [Configuration](configuration.md#admin-password). Add `SHIFTPLAN_SEED_DEMO_DATA=true` on the first start for sample staff and shifts.

## Commands

```bash
npm run dev             # Development server
npm run test:run        # Run tests once
npm run typecheck       # Type check the app and server/**
npm run build           # Production build
npm run docs            # Regenerate the generated parts of docs/api.md and docs/releases.md
npm run lint:length     # Fail on source files over 150 lines (aim for about 100)
npm run lint:english    # Fail on German comments, identifiers, test titles and log messages
npm run lint:boundaries # List import boundary violations (report mode, does not fail yet)
```

CI fails when the generated docs are stale. After adding or changing an API route, run `npm run docs` and commit the result.

Code, comments, test titles and log messages are English; German UI text lives in strings only. `npm run lint:english` runs in CI and flags comments with umlauts or two different German stopwords, identifiers with German stems (`kuerzel`, `firstKw`), German test titles and `console.*` messages. Quoted text such as „Früh“ is ignored, so comments can still name German UI labels. The public wire values `einladung`, `zugang`, `anfragen`, `urlaub`, `privat` and `sonstiges` stay allowed.

`npm run lint:boundaries` checks explicit imports: app code never imports `server/**` and imports `shared/**` through `~/shared/...` (a relative path breaks the SSR build); `shared/**` imports only `shared/**` and uses no h3, Nitro, Nuxt, Vue or Node globals; `server/utils/**` and `server/lib/**` never import `server/services/**`; a service reaches another feature only through its `<feature>.service.ts` or `<feature>/index.ts`; migrations import only `server/lib/migrations/**`; and there are no import cycles. It runs in CI in report mode until the known violations are gone.

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
| Code shared by app and server | `shared/utils/` |
| Server API | `server/api/` |
| Services | `server/services/` |
| Auth middleware | `server/middleware/auth.ts` |
| Backend config | `config/backend.config.json` |
| Tests | `tests/` |
| Release and docs scripts | `scripts/` |
| App API spec | `docs/api/app-v1.yaml` |
