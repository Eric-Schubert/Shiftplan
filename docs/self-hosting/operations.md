# Operations

Part of the [self-hosting guide](README.md).

## Updates

```bash
cd /opt/stacks/shiftplan
docker compose pull
docker compose up -d
docker image prune -f
```

Database migrations run automatically on start. Make a backup before larger version jumps. New versions and their changes are listed under [Releases](https://github.com/Eric-Schubert/Shiftplan/releases).

You can update the instance automatically, for example with Watchtower. If you prefer to decide yourself, pin a version in `image:` (see [`compose.yaml`](install-docker-compose.md#3-create-composeyaml)) and raise it deliberately.

## Backups

All data lives in `./db`: `db.sqlite` (plan, employees, shifts, absences) and `admin.sqlite` (users, sessions, devices, settings, relay access). SQLite runs in WAL mode, so stop the container briefly for a consistent backup:

```bash
cd /opt/stacks/shiftplan
docker compose stop
tar czf "/opt/backups/shiftplan-$(date +%F).tar.gz" db
docker compose start
```

That takes a few seconds. As a nightly cron job (`/etc/cron.d/shiftplan-backup`):

```cron
30 3 * * * root cd /opt/stacks/shiftplan && docker compose stop -t 10 && tar czf /opt/backups/shiftplan-$(date +\%F).tar.gz db; docker compose start
```

Restore:

```bash
cd /opt/stacks/shiftplan
docker compose stop
mv db db.alt
tar xzf /opt/backups/shiftplan-2026-10-08.tar.gz
chown -R 1000:1000 db
docker compose start
```

Keep backups off the server. They contain personal data.

## Troubleshooting

**The app says "Bitte eine gültige Adresse eingeben" (Please enter a valid address) or cannot find the instance.**
Enter the address without a path (`plan.example.de`). On a phone on the mobile network, open `https://plan.example.de` in the browser: if you get a certificate error or no response, the cause is DNS, the firewall or the certificate.

**The QR code opens `localhost` or an internal IP.**
The code was created through an internal address. Open the settings through `https://plan.example.de` and create the code again.

**"Der Code ist ungültig, abgelaufen oder wurde schon benutzt." (The code is invalid, expired or already used.)**
A QR code is valid for 7 days and only once. Create a new one under **App-Zugänge** (App access).

**The app gets no pushes.**

1. In the app, check whether notifications are on and whether "Nur meine" (only mine) is selected.
2. On the phone, check the system notification settings for the app.
3. Look for `SHIFTPLAN_PUSH_RELAY_URL=` without a value in `.env`. Older versions of this guide had that line in the template, but an empty value switches app pushes off (`/datenschutz` then says "Diese Instanz verschickt keine Pushes an die Shiftplan-App", this instance sends no pushes to the Shiftplan app). Delete the line and run `docker compose up -d`.
4. Check the instance log:

   ```bash
   docker compose logs shiftplan | grep "\[push\]"
   ```

   - `[push] Relay registration failed:` the instance cannot reach `push.shiftplan.info` (outbound firewall, DNS, proxy) or has hit the registration limit. Test: `docker compose exec shiftplan wget -qO- https://push.shiftplan.info/healthz`
   - `[push] Relay send failed: Relay responded with 429`: limit reached; try again later or contact support@es-software.eu.
   - `Relay responded with 403`: the instance is blocked at the relay; contact support@es-software.eu.
5. Pushes are only sent for changes in the current and the next week.

**Web push in the browser does not arrive.**
Web push needs HTTPS. On an iPhone, the page must be installed via Share → Add to Home Screen (iOS 16.4 or later); then tap the bell in the installed web app.

**Sign-in is locked after a few attempts, although only one person mistyped.**
Without `SHIFTPLAN_TRUST_PROXY_HEADERS`, an instance behind a proxy sees all requests coming from the proxy's IP, and five failed attempts by anyone lock sign-in for everyone. The log then shows `SHIFTPLAN_TRUST_PROXY_HEADERS is off` once. Set the variable to `true` (or `cloudflare` behind Cloudflare) and restart. Behind Cloudflare with `true`, all visitors from the same Cloudflare location share one limit.

**The container does not start, and the log shows `SQLITE_CANTOPEN` or `permission denied`.**
`sudo chown -R 1000:1000 /opt/stacks/shiftplan/db`

**Questions and bugs:** [GitHub Issues](https://github.com/Eric-Schubert/Shiftplan/issues) or support@es-software.eu.

Next: [Environment variables](environment-variables.md).
