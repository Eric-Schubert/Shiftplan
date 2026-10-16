# Install with Docker Compose

Part of the [self-hosting guide](README.md).

## 1. Create the directory

```bash
sudo mkdir -p /opt/stacks/shiftplan/db
cd /opt/stacks/shiftplan
sudo chown -R 1000:1000 db
```

The container runs as the user `node` (UID 1000). The data directory must belong to this user, otherwise SQLite cannot write.

## 2. Create `.env`

```bash
sudo nano /opt/stacks/shiftplan/.env
sudo chmod 600 /opt/stacks/shiftplan/.env
```

Complete example. Empty values are optional.

```env
# Initial password for the user "admin". Only read on the very first start.
# Change it after the first sign-in.
SHIFTPLAN_ADMIN_PASSWORD=UseALongRandomPassword2026

# Behind a reverse proxy: use the real client IP for sign-in lockouts.
# true = last entry in X-Forwarded-For (appended by the proxy).
# cloudflare = CF-Connecting-IP, only if the server accepts traffic from Cloudflare exclusively.
SHIFTPLAN_TRUST_PROXY_HEADERS=true

# Time zone for calendar weeks and push batching
TZ=Europe/Berlin

# Imprint and controller in the privacy policy.
# Required: name, street, postal code, city and email, otherwise /impressum shows a warning.
# For a GmbH, UG etc. also the legal form in the name, the authorized representatives and
# the register court and number.
NUXT_PUBLIC_IMPRINT_PROVIDER_NAME=Muster GmbH
NUXT_PUBLIC_IMPRINT_STREET_ADDRESS=Musterstraße 1
NUXT_PUBLIC_IMPRINT_POSTAL_CODE=01067
NUXT_PUBLIC_IMPRINT_CITY=Dresden
NUXT_PUBLIC_IMPRINT_COUNTRY=Deutschland
NUXT_PUBLIC_IMPRINT_PUBLIC_EMAIL=it@example.de
NUXT_PUBLIC_IMPRINT_PHONE=
NUXT_PUBLIC_IMPRINT_REPRESENTED_BY=Max Muster
NUXT_PUBLIC_IMPRINT_REGISTER_COURT=Amtsgericht Dresden
NUXT_PUBLIC_IMPRINT_REGISTER_NUMBER=HRB 12345
# VAT ID (USt-IdNr.) or business identification number (W-IdNr.), if any
NUXT_PUBLIC_IMPRINT_VAT_ID=

# true if the instance is delivered through Cloudflare (proxied).
# The privacy policy then lists Cloudflare as a processor.
NUXT_PUBLIC_PRIVACY_CLOUDFLARE=false

# Hosting provider with address if the server is rented (for example "netcup GmbH, Emmy-Noether-Straße 10,
# 76131 Karlsruhe"). The privacy policy then lists it as a processor. Leave empty for your own server.
NUXT_PUBLIC_PRIVACY_HOSTER=

# Contact for web push (VAPID). Default: mailto: with the imprint email.
SHIFTPLAN_PUSH_SUBJECT=

# Public address the instance tells the push relay, for example https://plan.example.de.
# Empty: the address through which the plan was last changed.
SHIFTPLAN_PUBLIC_URL=

# Relay for app pushes: not set = https://push.shiftplan.info.
# "off" (or an empty value) switches app pushes off, see the push notifications page.
# SHIFTPLAN_PUSH_RELAY_URL=off

# Optional: email notification for contact form requests via Microsoft Graph.
# Without these values, requests only show up in the admin area. With them, the
# privacy policy automatically lists Microsoft as a processor.
CONTACT_MAIL_PROVIDER=
CONTACT_MAIL_TO=
CONTACT_MAIL_GRAPH_TENANT_ID=
CONTACT_MAIL_GRAPH_CLIENT_ID=
CONTACT_MAIL_GRAPH_CLIENT_SECRET=
CONTACT_MAIL_GRAPH_FROM=
CONTACT_MAIL_SUBJECT_PREFIX=[Shiftplan]
CONTACT_MAIL_SAVE_TO_SENT_ITEMS=false
```

Only set `SHIFTPLAN_TRUST_PROXY_HEADERS=true` behind a reverse proxy. Without a proxy, clients could fake their IP and get around sign-in lockouts. If the instance runs behind Cloudflare, set `cloudflare`, but only if the firewall opens 80/443 exclusively to Cloudflare networks. Otherwise anyone could send their own `CF-Connecting-IP` header. Details are in [Proxy Headers](../configuration.md#proxy-headers).

Never set these on a real instance: `NUXT_PUBLIC_DEMO_LOGIN_USERNAME`, `NUXT_PUBLIC_DEMO_LOGIN_PASSWORD`, `SHIFTPLAN_DEMO_MEMBER_CODE`. They are meant for public demos only.

All variables with their defaults are listed in [Environment variables](environment-variables.md).

## 3. Create `compose.yaml`

```yaml
name: shiftplan

services:
  shiftplan:
    image: ghcr.io/eric-schubert/shiftplan:latest
    container_name: shiftplan
    restart: unless-stopped
    env_file:
      - .env
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 3000
    ports:
      # Publish locally only, outside access goes through the reverse proxy
      - "127.0.0.1:3000:3000"
    volumes:
      - ./db:/app/db
    # Keep logs small: at most 3 files of 1 MB each, the oldest is dropped
    logging:
      driver: json-file
      options:
        max-size: 1m
        max-file: "3"
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
      interval: 30s
      timeout: 5s
      start_period: 10s
      retries: 3
```

Instead of `latest` you can pin a version, for example `ghcr.io/eric-schubert/shiftplan:3.10.4`. Image tags have no `v` prefix, unlike the Git tags and GitHub releases (`v3.10.4`). With a pinned version you decide when to update; see [Updates](operations.md#updates).

## 4. Start

```bash
cd /opt/stacks/shiftplan
docker compose up -d
docker compose logs -f
```

On the first start the container creates the databases in `./db` and the user `admin` with the password from `SHIFTPLAN_ADMIN_PASSWORD`. The log then shows `[entrypoint] Setup completed.` followed by `Starting Shiftplan...`.

Quick test on the server:

```bash
curl -sI http://127.0.0.1:3000/ | head -1
```

Expected: `HTTP/1.1 200 OK`.

## Optional: backend settings

The German state for public and school holidays, the session duration, rate limits and other non-secret settings have built-in defaults (holidays: Saxony). To change them, mount a `config/backend.config.json` with the keys you want to change; everything else keeps its default. The example file from the repository holds the keys self-hosters typically change:

```bash
mkdir -p /opt/stacks/shiftplan/config
curl -fsSL -o /opt/stacks/shiftplan/config/backend.config.json \
  https://raw.githubusercontent.com/Eric-Schubert/Shiftplan/master/config/backend.config.json
```

```yaml
    volumes:
      - ./db:/app/db
      - ./config/backend.config.json:/app/config/backend.config.json:ro
```

Example: Bavaria instead of Saxony:

```json
{
  "holidays": {
    "public": { "subdivisionCodes": ["BY"] },
    "school": { "defaultSubdivisionCodes": ["BY"] }
  }
}
```

The file only needs the keys you change. Then run `docker compose up -d`. More settings and examples are in [Configuration](../configuration.md).

Next: [HTTPS through a reverse proxy](reverse-proxy.md).
