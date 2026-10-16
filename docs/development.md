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
npm run typecheck       # Type check the app, server/** and shared/**
npm run build           # Production build
npm run docs            # Regenerate the generated parts of docs/api.md and docs/releases.md
npm run lint:length     # Fail on source files over 150 lines (aim for about 100)
npm run lint:english    # Fail on German comments, identifiers, test titles and log messages
npm run lint:boundaries # Fail on import boundary violations (add -- --report to only list them)
```

CI fails when the generated docs are stale. After adding or changing an API route, run `npm run docs` and commit the result.

Code, comments, test titles and log messages are English; German UI text lives in strings only. `npm run lint:english` runs in CI and flags comments with umlauts or two different German stopwords, identifiers with German stems (`kuerzel`, `firstKw`), German test titles and `console.*` messages. Quoted text such as „Früh“ is ignored, so comments can still name German UI labels. The public wire values `einladung`, `zugang`, `anfragen`, `urlaub`, `privat` and `sonstiges` stay allowed.

`npm run lint:boundaries` checks explicit imports: app code and `types/` never import `server/**` (also not through `#server`); `server/**` never imports app code (`components/`, `composables/`, `stores/`, `utils/`, `pages/`, `layouts/`, `plugins/`, `app.vue`, `error.vue`), only `types/` and `shared/`; code outside `shared/**` imports it as `~/shared/...` (a relative path breaks the SSR build, `#shared` fails in vitest); `shared/**` imports only `shared/**` and uses none of a list of h3, Nitro, Nuxt, Vue, browser and Node globals; `i18n/**` imports only `i18n/**`, `shared/**`, `@intlify/core` and `vue-i18n`, with the same list of globals; `server/utils/**` and `server/lib/**` never import `server/services/**`; a service reaches another feature, and `server/api/**`, `server/middleware/**`, `server/plugins/**` and `server/routes/**` reach any feature, only through its `<feature>.service.ts` or `<feature>/index.ts`; migrations import only `server/lib/migrations/**`; and there are no import cycles. CI fails on any violation. `npm run typecheck` also checks `shared/**` against `.nuxt/tsconfig.shared.json`, which has no app or server auto-imports.

### Server layout

Nitro auto-imports every export of `server/utils/`, so it holds infrastructure only: database and migrations, sessions and auth guards, validation, the xlsx helpers, the planning date, JSON bodies and the demo account check. Server code still imports all of it explicitly.

Texts are on their way into catalogs, one namespace per file under `i18n/locales/<locale>/` (for example `common.ts`), merged in `i18n/locales/<locale>/index.ts` and read as `namespace.key`. Messages use vue-i18n syntax: `{param}`, plurals as `one | many`, and `{'@'}` for a literal `@`. The app reads them with `useI18n()`, the server with `t(locale, key, params)` from `i18n/server.ts`; `resolveLocale(event)` picks the request's locale. Dates, weeks and numbers go through `shared/utils/format/*` with a full language tag as first argument (`de-DE`, from `useLocaleTag()` in the app, `instanceLocaleTag()` or `localeTag(resolveLocale(event))` on the server), never through `toLocale*` with a fixed locale. `tests/i18n-keys.test.ts` checks the literal keys of `t()`, `$t()`, `tm()` and `<i18n-t keypath>` in app code against the catalog, because vue-i18n accepts any string. German is the only locale so far.

The app shell, the plan page and the personal sign-in already read all texts from the catalog; `tests/i18n-client-literals.test.ts` fails on German left in those folders and lists the files whose step is still open. A sentence around an element (a bold name, an icon) is one message rendered with `<i18n-t keypath tag>`. Utilities and stores return catalog keys or a `MessageRef` (`{ key, params }`, `i18n/types.ts`) and the component translates them; label maps such as `ABSENCE_REASON_KEYS` map wire values to keys. Vue drops a bare space between an element's start and an interpolation, so where that space separates inline text (`<span>{{ " " + t("absence.panel.isOut") }}</span>`) write it into the expression.

Domain code lives in feature folders under `server/services/`. Each feature has one facade, `<feature>.service.ts`, and its internals in `<feature>/`: the stored data (`store.ts` and similar) and the flows that tie features together, such as `absence/report.ts` (absence, takeover requests, push) or `shift-request/flow/*`. Other features, API handlers, middleware, Nitro plugins and routes use only the facade. Internals never import their own facade, because the facade re-exports them and that would be a cycle. `server/lib/` holds the building blocks below the features (session records, validation, xlsx, holidays) and the plain-JS migrations that `setup.js` runs outside the Nitro bundle; the Docker image copies `server/lib/migrations` and `server/utils/database-migrations.js` for that.

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
| Date, week and number formatting | `shared/utils/format/` |
| Text catalogs and server translator | `i18n/` |
| Server API | `server/api/` |
| Feature facades | `server/services/<feature>.service.ts` |
| Feature internals and flows | `server/services/<feature>/` |
| Server infrastructure (auto-imported) | `server/utils/` |
| Server libraries and migrations | `server/lib/` |
| Auth middleware | `server/middleware/auth.ts` |
| Backend config | `config/backend.config.json` |
| Tests | `tests/` |
| Release and docs scripts | `scripts/` |
| App API spec | `docs/api/app-v1.yaml` |
