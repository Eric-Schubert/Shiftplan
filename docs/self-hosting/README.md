# Self-hosting Shiftplan

This guide sets up your own Shiftplan instance: planning in the browser, the team on the Shiftplan app (iOS and Android), and push notifications. Shiftplan is a single Docker container with SQLite; a small server or VM is enough.

If you would rather not deal with servers, updates and backups: ES Software runs hosted instances as `<company>.shiftplan.info`. Ask at support@es-software.eu.

## Pages

1. [Install with Docker Compose](install-docker-compose.md): directory, `.env`, `compose.yaml`, first start, optional backend settings
2. [HTTPS through a reverse proxy](reverse-proxy.md): Caddy, nginx, Traefik, testing from outside
3. [First setup and the Shiftplan app](first-setup-and-app.md): admin sign-in, team access, personal QR codes, multiple instances
4. [Push notifications](push.md): when pushes are sent, the push relay, limits, switching app pushes off, firewall
5. [Privacy policy and imprint](privacy-imprint.md)
6. [Operations](operations.md): updates, backups, troubleshooting
7. [Environment variables](environment-variables.md)

The backend config file (holidays, sessions, rate limits) is described in [Configuration](../configuration.md).

The Shiftplan UI is German. This guide quotes menu items and buttons as they appear on screen, with an English translation in parentheses where it helps, for example **Einstellungen → App-Zugänge** (Settings → App access).

## Overview

```text
 Planners (browser) ──┐
                      │  HTTPS
 Team (browser) ──────┼──────────►  your instance  (Docker, SQLite)
                      │             https://plan.example.de
 Team (app) ──────────┘                    │
                                           │ app pushes only, HTTPS
                                           ▼
                               push.shiftplan.info  (relay run by ES Software)
                                           │
                                           ▼
                        Firebase Cloud Messaging ─► Android
                                      └──── APNs ─► iPhone
```

- All planning data stays in your instance.
- The app talks directly to your instance, not to ES Software.
- Only for push notifications to the app do the title and text of a message go through the relay `push.shiftplan.info` to Google and Apple. Why there is no other way, and what is transmitted, is explained under [Push notifications](push.md).

## Requirements

- A Linux server with Docker and Docker Compose (the `docker compose` plugin)
- Your own domain or subdomain, for example `plan.example.de`, pointing at the server
- A reverse proxy with a valid TLS certificate (Let's Encrypt or similar)
- Reachability from the internet if the team should use the app on the go. A VPN works too, but then every phone has to be on the VPN.
- Outbound HTTPS (port 443) to `push.shiftplan.info` if the app should receive pushes

Two hard requirements of the app:

- **HTTPS with a valid certificate.** iOS and Android block unencrypted connections and self-signed certificates.
- **A domain or subdomain of its own, not a subpath.** The app only uses the host and port of an address. `https://example.de/shiftplan` does not work, `https://plan.example.de` does.

Next: [Install with Docker Compose](install-docker-compose.md).
