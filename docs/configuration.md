# Configuration

Shiftplan reads non-secret settings from a JSON file and secrets from environment variables. For a complete list of environment variables with defaults, see [Environment variables](self-hosting/environment-variables.md) in the self-hosting guide.

## Backend Config File

Non-secret backend settings have built-in defaults in `server/lib/config/defaults.js`: holiday regions, school holiday regions, session duration, rate limits, validation limits, shift defaults, analytics retention, XLSX limits, and proxy-header trust. The server, `setup.js` and the Docker entrypoint read the same defaults, so an instance runs without any config file.

An optional file `config/backend.config.json` overrides them. It only needs the keys that differ: objects are merged key by key, lists and single values from the file replace the default. `holidays.subdivisionNames` is the one object the file replaces as a whole, because it is also the list of states the holiday API accepts. The merged result is validated at startup, so a wrong value stops the server with the same message a complete file produced. `SHIFTPLAN_BACKEND_CONFIG_PATH` names a different file; a path set there must exist. The file in the repository is an example that only names the holiday states (Saxony, the default); proxy-header trust comes from the environment variable `SHIFTPLAN_TRUST_PROXY_HEADERS`, see [Proxy Headers](#proxy-headers).

Secrets intentionally stay in `.env`, for example `SHIFTPLAN_ADMIN_PASSWORD` or Microsoft Graph credentials.

The Compose file mounts `./config/backend.config.json` to `/app/config/backend.config.json`, so backend settings can be changed without rebuilding the image. The image itself ships no file. A complete copy of the file from an older release keeps working unchanged: the merge gives every key the value from the file. Trimming such a copy down to the changed keys is still worth it, because a complete copy pins every value, so changed defaults of a new release do not reach the instance.

The web client follows the same file. It loads the password policy (`auth.passwordPolicy`, including `hint`), the user name length (`auth.users`), the contact form lengths (`contact.form`), the shift color and minimum staff range (`validation.shift.defaultColor`, `validation.shift.minStaff`) and the CSRF settings (`auth.session.cookies.csrfName`, `auth.routes.csrfMethods`, upper-cased on load) from `GET /api/instance` when the page loads. The privacy policy names the statistics period (`analytics.retentionDays`), the session duration (`auth.session.durationMinutes`) and the cookie names (`auth.session.cookies`) from `GET /api/legal/privacy`; the other retention periods are fixed in `shared/utils/retention.ts`. A restart after editing the mounted file is enough; the prebuilt image does not need a rebuild.

Holiday example, a complete file for Bavaria (every other setting keeps its default):

```json
{
  "holidays": {
    "public": {
      "subdivisionCodes": ["BY"]
    },
    "school": {
      "defaultSubdivisionCodes": ["BY"]
    }
  }
}
```

Country, states and the language of holiday names belong to the instance, not to the reader's UI language. `holidays.countryIsoCode` picks the country (`DE`), state codes work with or without its prefix (`SN` or `DE-SN`), and `holidays.languageIsoCode` picks the language of the names the OpenHolidays API sends (`DE`); a holiday without a name in that language shows the API's first name. `holidays.subdivisionNames` holds the state names shown next to the holidays.

## API Route Access

Which API routes work without a planner login is built in (`server/config/route-policy.ts`); [API](api.md) lists the access level of every endpoint. The config file cannot open or close routes. To keep the plan private, set a team access code in the settings.

Older copies of `backend.config.json` contain `auth.routes.public` and `auth.routes.publicGetPrefixes`. A mounted file with these keys still starts, but the lists are no longer read. Remove both keys from the mounted file. If a list was edited:

- Extra entries are ignored, so they no longer open routes. The server logs `auth.routes.public is ignored` (or `publicGetPrefixes`) at startup.
- If a list leaves out an entry that every release shipped (for example `/api/staff`), that route needed a planner login on this instance. The built-in policy would open it, so the server refuses to start and names the entry. Remove the keys; to keep the plan private, set a team access code instead.

`auth.routes.csrfMethods` stays optional: the HTTP methods that need the CSRF token with a cookie session, `POST`, `PATCH`, `PUT` and `DELETE` by default. An empty list is rejected, because it would turn CSRF protection off. Requests with a Bearer token from the app never need it.

## Admin Password

Set a bootstrap password before the first start:

```bash
SHIFTPLAN_ADMIN_PASSWORD=SecurePassword1
```

The setup creates the initial `admin` user. Change this password after the first login. Predictable defaults such as `admin/admin` are not generated. If an existing database still contains an unchanged default admin, startup is blocked until `SHIFTPLAN_ADMIN_PASSWORD` is set and `node setup.js` is run again.

Usernames are case-sensitive: `Planer` and `planer` are two different accounts.

## Sample Data

A new instance starts without staff and shifts. For sample data on the first start, set:

```bash
SHIFTPLAN_SEED_DEMO_DATA=true
```

The setup then adds five sample employees and three shifts, but only while the staff list is empty. A public demo instance (`NUXT_PUBLIC_DEMO_LOGIN_USERNAME` set) gets them without this variable.

## Proxy Headers

Proxy headers are ignored by default so clients cannot spoof their IP address to bypass rate limits. Sign-in limits count failures per client network (IPv4 address or IPv6 /64) and, more generously, per account or short code, so guessing from many addresses still hits a limit while one stranger alone cannot lock a colleague out.

`auth.trustProxyHeaders` (or the environment variable `SHIFTPLAN_TRUST_PROXY_HEADERS`, which overrides it without copying the config file) accepts three values:

| Value | Client address | Use when |
|---|---|---|
| `false` | the TCP peer | the app is reachable directly, without a proxy |
| `true` | the rightmost `X-Forwarded-For` entry, which the proxy in front appended | one reverse proxy (Caddy, nginx, Traefik) is in front |
| `cloudflare` | `CF-Connecting-IP`, otherwise like `true` | the origin accepts traffic from Cloudflare only (firewall or Traefik/nginx allow list) |

Behind a proxy with `false`, every client shares the proxy's address and therefore one set of sign-in limits: five wrong passwords from anyone block planner sign-in for everyone for 15 minutes. The app logs a warning once when it sees `X-Forwarded-For` in this mode. Never use `cloudflare` on an origin that is also reachable without Cloudflare: anyone could then send their own `CF-Connecting-IP`.

The same setting decides whether the page statistics take a visitor's country, region and city from proxy headers: with `false` they stay empty, with `cloudflare` only `CF-IPCountry` counts, with `true` the headers of common hosting proxies do. The statistics record at most 300 page views per client network and hour.

## Environment In Docker

The local `.env` file is not copied into the image. Pass it at runtime with `--env-file .env` or with `env_file` in Docker Compose so imprint and runtime variables are available inside the container. Compose reads `.env` for YAML interpolation, but it only passes values to the container when `env_file` is configured.

## Privacy Policy

If the instance is served through Cloudflare, set `NUXT_PUBLIC_PRIVACY_CLOUDFLARE=true`. The privacy policy then lists Cloudflare as a processor.

If the instance runs on a rented server, set `NUXT_PUBLIC_PRIVACY_HOSTER` to the provider's name and address, for example `netcup GmbH, Emmy-Noether-Straße 10, 76131 Karlsruhe`. The privacy policy then lists the hoster as a processor. Leave it empty when you run the server yourself. `NUXT_PUBLIC_PRIVACY_HOSTER_LOCATION` takes the ISO 3166 country code of the hoster's data centre, for example `DE`; the policy writes it out in each language („in einem Rechenzentrum in Deutschland“, “in a data centre in Germany”). A value that is no country code appears as written. Leave it empty if you do not know where the server is, and the policy names no country.

## Push Notifications

Web Push uses VAPID keys that each instance generates on first use and stores in the admin database. The VAPID contact defaults to `mailto:` with `NUXT_PUBLIC_IMPRINT_PUBLIC_EMAIL`. Set it explicitly if needed:

```bash
SHIFTPLAN_PUSH_SUBJECT=mailto:support@example.com
```

The instance tells the push relay its public address. Set it explicitly so it never depends on request headers; without it, the instance uses the address of the last plan change, and only a public `https://` address counts. With neither `SHIFTPLAN_PUSH_SUBJECT` nor an imprint email it is also the VAPID contact.

```bash
SHIFTPLAN_PUBLIC_URL=https://plan.example.de
```

Pushes to the native Shiftplan app go through the push relay at `https://push.shiftplan.info` as long as `SHIFTPLAN_PUSH_RELAY_URL` is not set. To switch app pushes off entirely:

```bash
SHIFTPLAN_PUSH_RELAY_URL=off
```

An empty value (`SHIFTPLAN_PUSH_RELAY_URL=`) switches app pushes off as well. Any other URL is used as the relay. The privacy policy follows this setting: it names `push.shiftplan.info` with Cloudflare, the host of a custom relay, or states that the instance sends no app pushes.

See [Features](features.md#team-access-and-push-notifications) for how push works.

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
CONTACT_MAIL_SUBJECT_PREFIX=[Shiftplan]
CONTACT_MAIL_SAVE_TO_SENT_ITEMS=false
```

Create a Microsoft Entra app registration with the Microsoft Graph application permission `Mail.Send`, grant admin consent, and ideally restrict the app to the sending mailbox. Without these variables, the contact form still works and stores requests locally only. The privacy policy names Microsoft only when this setup is complete.

The mail is written in the instance's language (**Einstellungen → Team-Zugang** → default language, German unless changed), dates included; `contactMail.timezone` in `config/backend.config.json` sets the time zone of the received time. Older config files may still contain `contactMail.dateLocale`. The server ignores it with a warning at startup, so remove it from a mounted copy.

## Demo Instance

For a public demo instance, set `NUXT_PUBLIC_DEMO_LOGIN_USERNAME` and `NUXT_PUBLIC_DEMO_LOGIN_PASSWORD`. The login page then shows these credentials with a button to fill them in.

`SHIFTPLAN_DEMO_MEMBER_CODE` enables a reusable code that signs in as one employee (`SHIFTPLAN_DEMO_MEMBER_NAME`, default: first active employee). It lets store reviewers and visitors try the app without a QR code.

Never set any of these on a real instance.
