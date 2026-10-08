# Configuration

Shiftplan reads non-secret settings from a JSON file and secrets from environment variables. For a complete list of environment variables with defaults, see [Alle Umgebungsvariablen](self-hosting.md#alle-umgebungsvariablen) in the self-hosting guide.

## Backend Config File

Non-secret backend settings live in `config/backend.config.json`. This includes holiday regions, school holiday regions, session duration, rate limits, validation limits, shift defaults, analytics retention, XLSX limits, and proxy-header trust.

Secrets intentionally stay in `.env`, for example `SHIFTPLAN_ADMIN_PASSWORD` or Microsoft Graph credentials. Use `SHIFTPLAN_BACKEND_CONFIG_PATH` to load a different backend config file.

The Compose file mounts `./config/backend.config.json` to `/app/config/backend.config.json`, so backend settings can be changed without rebuilding the image.

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

## Admin Password

Set a bootstrap password before the first start:

```bash
SHIFTPLAN_ADMIN_PASSWORD=SecurePassword1
```

The setup creates the initial `admin` user. Change this password after the first login. Predictable defaults such as `admin/admin` are not generated. If an existing database still contains an unchanged default admin, startup is blocked until `SHIFTPLAN_ADMIN_PASSWORD` is set and `node setup.js` is run again.

## Proxy Headers

Proxy headers such as `x-forwarded-for` are ignored by default so clients cannot spoof their IP address to bypass rate limits. Set `auth.trustProxyHeaders` to `true` only when the app runs behind a trusted reverse proxy that overwrites these headers. The environment variable `SHIFTPLAN_TRUST_PROXY_HEADERS=true` overrides this value without copying the config file.

## Environment In Docker

The local `.env` file is not copied into the image. Pass it at runtime with `--env-file .env` or with `env_file` in Docker Compose so imprint and runtime variables are available inside the container. Compose reads `.env` for YAML interpolation, but it only passes values to the container when `env_file` is configured.

## Privacy Policy

If the instance is served through Cloudflare, set `NUXT_PUBLIC_PRIVACY_CLOUDFLARE=true`. The privacy policy then lists Cloudflare as a processor.

## Push Notifications

Web Push uses VAPID keys that each instance generates on first use and stores in the admin database. The VAPID contact defaults to `mailto:` with `NUXT_PUBLIC_IMPRINT_PUBLIC_EMAIL`. Set it explicitly if needed:

```bash
SHIFTPLAN_PUSH_SUBJECT=mailto:support@example.com
```

Pushes to the native Shiftplan app go through the push relay at `https://push.shiftplan.info`. To switch app pushes off entirely:

```bash
SHIFTPLAN_PUSH_RELAY_URL=off
```

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
CONTACT_MAIL_SUBJECT_PREFIX=[Schichtplaner]
CONTACT_MAIL_SAVE_TO_SENT_ITEMS=false
```

Create a Microsoft Entra app registration with the Microsoft Graph application permission `Mail.Send`, grant admin consent, and ideally restrict the app to the sending mailbox. Without these variables, the contact form still works and stores requests locally only.

## Demo Instance

For a public demo instance, set `NUXT_PUBLIC_DEMO_LOGIN_USERNAME` and `NUXT_PUBLIC_DEMO_LOGIN_PASSWORD`. The login page then shows these credentials with a button to fill them in.

`SHIFTPLAN_DEMO_MEMBER_CODE` enables a reusable code that signs in as one employee (`SHIFTPLAN_DEMO_MEMBER_NAME`, default: first active employee). It lets store reviewers and visitors try the app without a QR code.

Never set any of these on a real instance.
