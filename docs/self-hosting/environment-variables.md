# Environment variables

Part of the [self-hosting guide](README.md). A complete `.env` example is in [Install with Docker Compose](install-docker-compose.md#2-create-env); non-secret settings live in the backend config file, see [Configuration](../configuration.md).

| Variable | Purpose | Default |
|---|---|---|
| `SHIFTPLAN_ADMIN_PASSWORD` | initial password for `admin`, only read on the first start | – (required on the first start) |
| `SHIFTPLAN_SEED_DEMO_DATA` | `true` adds five sample employees and three shifts on start, but only while the staff list is empty; a public demo instance gets them without it | not set: a new instance starts without staff and shifts |
| `SHIFTPLAN_TRUST_PROXY_HEADERS` | take the client IP from the proxy: `true` (last entry in `X-Forwarded-For`) or `cloudflare` (`CF-Connecting-IP`) | `false` |
| `SHIFTPLAN_PUSH_RELAY_URL` | relay for app pushes; `off` or an empty value switches them off | not set: `https://push.shiftplan.info` |
| `SHIFTPLAN_PUSH_SUBJECT` | VAPID contact for web push | `mailto:` + imprint email |
| `SHIFTPLAN_PUBLIC_URL` | public HTTPS address for the push relay and the VAPID contact | address of the last plan change |
| `SHIFTPLAN_BACKEND_CONFIG_PATH` | different path for the optional `backend.config.json`, which only needs the keys that differ from the built-in defaults; the file must exist | `/app/config/backend.config.json` if mounted, otherwise the built-in defaults |
| `TZ` | time zone | `UTC` |
| `NUXT_PUBLIC_IMPRINT_*` | imprint and controller. Required: name, street, postal code, city and email; for a GmbH, UG etc. also the authorized representatives and the register. If the name, address or email is missing, `/impressum` shows a warning; while the name or address is missing, `/datenschutz` shows it instead of the controller | empty |
| `NUXT_PUBLIC_PRIVACY_CLOUDFLARE` | list Cloudflare in the privacy policy | `false` |
| `NUXT_PUBLIC_PRIVACY_HOSTER` | list the hosting provider with its address in the privacy policy | empty |
| `NUXT_PUBLIC_PRIVACY_HOSTER_LOCATION` | country of the hoster's data centre, named in the privacy policy after the hoster, for example `Deutschland`; empty names no country | empty |
| `CONTACT_MAIL_*` | email notification for contact form requests via Microsoft Graph; the privacy policy then lists Microsoft automatically | off |
| `NUXT_PUBLIC_DEMO_LOGIN_*`, `SHIFTPLAN_DEMO_MEMBER_*` | public demos only | off |
