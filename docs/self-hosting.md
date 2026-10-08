# Shiftplan selbst betreiben

Diese Anleitung richtet eine eigene Shiftplan-Instanz ein: Planung im Browser, Team über die Shiftplan-App (iOS und Android) und Push-Nachrichten. Shiftplan ist ein einzelner Docker-Container mit SQLite, ein kleiner Server oder eine VM reicht.

Wer sich um Server, Updates und Backups nicht kümmern will: ES Software betreibt Instanzen als `<firma>.shiftplan.info`, Anfrage an support@es-software.eu.

## Inhalt

1. [Überblick](#überblick)
2. [Voraussetzungen](#voraussetzungen)
3. [Installation mit Docker Compose](#installation-mit-docker-compose)
4. [HTTPS über einen Reverse Proxy](#https-über-einen-reverse-proxy)
5. [Erste Einrichtung](#erste-einrichtung)
6. [Die Shiftplan-App anbinden](#die-shiftplan-app-anbinden)
7. [Push-Nachrichten](#push-nachrichten)
8. [Datenschutz und Impressum](#datenschutz-und-impressum)
9. [Updates](#updates)
10. [Backups](#backups)
11. [Alle Umgebungsvariablen](#alle-umgebungsvariablen)
12. [Fehlersuche](#fehlersuche)

## Überblick

```text
 Planung (Browser) ──┐
                     │  HTTPS
 Team (Browser) ─────┼──────────►  deine Instanz  (Docker, SQLite)
                     │             https://plan.example.de
 Team (App) ─────────┘                    │
                                          │ nur für App-Pushes, HTTPS
                                          ▼
                              push.shiftplan.info  (Relay von ES Software)
                                          │
                                          ▼
                       Firebase Cloud Messaging ─► Android
                                     └──── APNs ─► iPhone
```

- Alle Planungsdaten bleiben in deiner Instanz.
- Die App spricht direkt mit deiner Instanz, nicht mit ES Software.
- Nur für Push-Nachrichten an die App gehen Titel und Text einer Nachricht über das Relay `push.shiftplan.info` an Google und Apple. Warum das nicht anders geht und was dabei übertragen wird, steht unter [Push-Nachrichten](#push-nachrichten).

## Voraussetzungen

- Linux-Server mit Docker und Docker Compose (Plugin `docker compose`)
- Eine eigene (Sub-)Domain, z. B. `plan.example.de`, die auf den Server zeigt
- Ein Reverse Proxy mit gültigem TLS-Zertifikat (Let's Encrypt o. ä.)
- Erreichbarkeit aus dem Internet, wenn das Team die App unterwegs nutzen soll. Ein VPN geht auch, dann muss jedes Handy im VPN sein.
- Ausgehend HTTPS (Port 443) zu `push.shiftplan.info`, wenn die App Pushes bekommen soll

Zwei harte Anforderungen der App:

- **HTTPS mit gültigem Zertifikat.** iOS und Android blockieren unverschlüsselte Verbindungen und selbst signierte Zertifikate.
- **Eigene (Sub-)Domain, kein Unterpfad.** Die App verwendet nur Host und Port einer Adresse. `https://example.de/shiftplan` funktioniert nicht, `https://plan.example.de` schon.

## Installation mit Docker Compose

### 1. Verzeichnis anlegen

```bash
sudo mkdir -p /opt/stacks/shiftplan/db
cd /opt/stacks/shiftplan
sudo chown -R 1000:1000 db
```

Der Container läuft als Benutzer `node` (UID 1000). Der Datenordner muss diesem Benutzer gehören, sonst kann SQLite nicht schreiben.

### 2. `.env` anlegen

```bash
sudo nano /opt/stacks/shiftplan/.env
sudo chmod 600 /opt/stacks/shiftplan/.env
```

Vollständiges Beispiel. Leere Werte sind optional.

```env
# Start-Passwort für den Benutzer "admin". Wird nur beim allerersten Start gelesen.
# Nach dem ersten Login in der App ändern.
SHIFTPLAN_ADMIN_PASSWORD=BitteLangesZufallsPasswort2026

# Hinter einem Reverse Proxy: echte Client-IP aus X-Forwarded-For verwenden
# (wichtig für Rate-Limits beim Login). Nur setzen, wenn der Proxy den Header überschreibt.
SHIFTPLAN_TRUST_PROXY_HEADERS=true

# Zeitzone für Kalenderwochen und Push-Bündelung
TZ=Europe/Berlin

# Impressum und Verantwortlicher in der Datenschutzerklärung
NUXT_PUBLIC_IMPRINT_PROVIDER_NAME=Muster GmbH
NUXT_PUBLIC_IMPRINT_STREET_ADDRESS=Musterstraße 1
NUXT_PUBLIC_IMPRINT_POSTAL_CODE=01067
NUXT_PUBLIC_IMPRINT_CITY=Dresden
NUXT_PUBLIC_IMPRINT_COUNTRY=Deutschland
NUXT_PUBLIC_IMPRINT_PUBLIC_EMAIL=it@example.de
NUXT_PUBLIC_IMPRINT_PHONE=
NUXT_PUBLIC_IMPRINT_REPRESENTED_BY=Max Muster
NUXT_PUBLIC_IMPRINT_REGISTER_COURT=
NUXT_PUBLIC_IMPRINT_REGISTER_NUMBER=
NUXT_PUBLIC_IMPRINT_VAT_ID=

# true, wenn die Instanz über Cloudflare (Proxy) ausgeliefert wird.
# Die Datenschutzerklärung nennt Cloudflare dann als Auftragsverarbeiter.
NUXT_PUBLIC_PRIVACY_CLOUDFLARE=false

# Kontakt für Web Push (VAPID). Standard: mailto: mit der Impressums-E-Mail.
SHIFTPLAN_PUSH_SUBJECT=

# Relay für App-Pushes. Leer lassen = https://push.shiftplan.info.
# "off" schaltet App-Pushes ab, siehe Abschnitt Push-Nachrichten.
SHIFTPLAN_PUSH_RELAY_URL=

# Optional: Benachrichtigung über das Kontaktformular per Microsoft Graph.
# Ohne diese Werte landen Anfragen nur im Admin-Bereich.
CONTACT_MAIL_PROVIDER=
CONTACT_MAIL_TO=
CONTACT_MAIL_GRAPH_TENANT_ID=
CONTACT_MAIL_GRAPH_CLIENT_ID=
CONTACT_MAIL_GRAPH_CLIENT_SECRET=
CONTACT_MAIL_GRAPH_FROM=
CONTACT_MAIL_SUBJECT_PREFIX=[Shiftplan]
CONTACT_MAIL_SAVE_TO_SENT_ITEMS=false
```

`SHIFTPLAN_TRUST_PROXY_HEADERS=true` nur mit Reverse Proxy setzen. Ohne Proxy könnten Clients ihre IP fälschen und Login-Sperren umgehen.

Nie auf einer echten Instanz setzen: `NUXT_PUBLIC_DEMO_LOGIN_USERNAME`, `NUXT_PUBLIC_DEMO_LOGIN_PASSWORD`, `SHIFTPLAN_DEMO_MEMBER_CODE`. Die sind nur für öffentliche Demos gedacht.

### 3. `compose.yaml` anlegen

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
      # Nur lokal veröffentlichen, nach außen geht es über den Reverse Proxy
      - "127.0.0.1:3000:3000"
    volumes:
      - ./db:/app/db
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

Statt `latest` kannst du eine feste Version angeben, z. B. `ghcr.io/eric-schubert/shiftplan:v2.18.0`. Dann bestimmst du selbst, wann aktualisiert wird.

### 4. Starten

```bash
cd /opt/stacks/shiftplan
docker compose up -d
docker compose logs -f
```

Beim ersten Start legt der Container die Datenbanken in `./db` an und erstellt den Benutzer `admin` mit dem Passwort aus `SHIFTPLAN_ADMIN_PASSWORD`. Im Log steht dann `[entrypoint] Setup completed.` und danach `Starting Shiftplan...`.

Kurzer Test auf dem Server:

```bash
curl -sI http://127.0.0.1:3000/ | head -1
```

Erwartet: `HTTP/1.1 200 OK`.

### Optional: Backend-Einstellungen

Bundesland für Feiertage und Schulferien, Sitzungsdauer, Rate-Limits und weitere nicht geheime Einstellungen stehen in `config/backend.config.json`. Die Standardwerte stecken im Image (Feiertage: Sachsen). Zum Anpassen die Datei aus dem Repo holen und einbinden:

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

Beispiel Bayern statt Sachsen:

```json
{
  "holidays": {
    "public": { "subdivisionCodes": ["BY"] },
    "school": { "defaultSubdivisionCodes": ["BY"] }
  }
}
```

Nur die geänderten Schlüssel anpassen, den Rest der Datei stehen lassen. Danach `docker compose up -d`.

## HTTPS über einen Reverse Proxy

Die Instanz lauscht nur auf `127.0.0.1:3000`. Nach außen braucht sie einen Reverse Proxy mit TLS. Jeder Proxy geht, Hauptsache:

- eigene (Sub-)Domain, Weiterleitung von `/` auf `http://127.0.0.1:3000`
- gültiges Zertifikat
- der Proxy setzt `X-Forwarded-For` und `X-Forwarded-Proto`
- HTTP leitet auf HTTPS weiter

### Caddy (am einfachsten)

Caddy holt das Zertifikat selbst. `/etc/caddy/Caddyfile`:

```caddyfile
plan.example.de {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name plan.example.de;

    ssl_certificate     /etc/letsencrypt/live/plan.example.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/plan.example.de/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name plan.example.de;
    return 301 https://$host$request_uri;
}
```

`client_max_body_size` hebt das nginx-Limit von 1 MB an, damit größere Excel-Dateien beim Import von Rotationsmustern nicht abgewiesen werden.

### Traefik (Dateiprovider)

Ein Router auf den lokalen Port, z. B. in `dynamic/shiftplan.yml`:

```yaml
http:
  routers:
    shiftplan:
      rule: Host(`plan.example.de`)
      entryPoints: [websecure]
      service: shiftplan
      tls:
        certResolver: letsencrypt
  services:
    shiftplan:
      loadBalancer:
        servers:
          - url: http://127.0.0.1:3000
```

### Test von außen

```bash
curl -sI https://plan.example.de/ | head -1
```

Erwartet: `HTTP/2 200`. Zusätzlich im Browser prüfen, dass kein Zertifikatsfehler kommt, auch auf einem Handy im Mobilfunknetz.

## Erste Einrichtung

1. `https://plan.example.de` öffnen, auf das Zahnrad tippen und mit `admin` und dem Start-Passwort anmelden.
2. Passwort sofort ändern (Einstellungen → Passwort ändern).
3. Schichten mit Zeiten und Mindestbesetzung, Mitarbeitende und ein Rotationsmuster anlegen. Vorhandene Pläne lassen sich per Excel übernehmen.
4. **Einstellungen → Team-Zugang → Name in der App:** einen Namen setzen, z. B. „Pflegeteam Nord“. Den sehen Mitarbeitende in der App, und er erscheint beim Push-Relay als Name der Instanz.
5. Optional unter **Team-Zugang** einen Zugangscode setzen. Ohne Code kann jeder mit dem Link den Plan im Browser lesen. Mit Code braucht der Browser einmal den Code oder QR-Code. Für die App ist das egal, sie nutzt persönliche Zugänge.
6. Für Planerinnen und Planer ohne Admin-Rechte eigene Benutzer mit der Rolle „Planer“ anlegen.

**Wichtig für die App:** Alle QR-Codes enthalten die Adresse, unter der die Einstellungen gerade im Browser offen sind. Codes deshalb immer über die öffentliche Adresse `https://plan.example.de` erzeugen, nie über `http://localhost:3000` oder eine LAN-IP. Sonst landet im QR-Code eine Adresse, die das Handy nicht erreicht.

## Die Shiftplan-App anbinden

Die Shiftplan-App für iPhone und Android verbindet sich mit jeder Instanz. Mitarbeitende brauchen kein Konto und keine E-Mail-Adresse. Wer die App nicht nutzen will, meldet sich genauso im Browser an.

### Zugang für eine Person

1. Im Browser **Einstellungen → App-Zugänge** öffnen (Planer oder Admin).
2. Person auswählen und einen QR-Code erzeugen. Der Code gilt 7 Tage und lässt sich einmal einlösen.
3. QR-Code ausdrucken oder am Bildschirm zeigen.
4. In der App „QR-Code scannen“ tippen und scannen, oder den Link im Browser öffnen und „Im Browser anmelden“ wählen.
5. Bei der ersten Anmeldung legt die Person eine PIN fest. Danach meldet sie sich auf jedem weiteren Gerät mit Kürzel (z. B. `MM`) und PIN an, ohne neuen QR-Code.

Der QR-Code enthält eine Adresse wie `https://plan.example.de/?einladung=CODE`. Die App merkt sich die Instanz und bekommt einen Zugang, der an diese eine Person gebunden ist. Ohne Kamera geht es über „Ohne Kamera einrichten“: Adresse `plan.example.de` eingeben und den Code unter dem QR-Code abtippen.

Unter **App-Zugänge** siehst du alle eingerichteten Geräte und kannst einzelne sperren. Ein gesperrtes Gerät verliert sofort den Zugang und bekommt keine Pushes mehr. PIN vergessen: dort „PIN zurücksetzen“ und einen neuen QR-Code erzeugen. Das Kürzel änderst du unter **Mitarbeiter**.

### Planer-Anmeldung in der App

Planerinnen und Planer können sich in der App zusätzlich mit Benutzername und Passwort anmelden („Als Planer anmelden“) und dort Ausfälle eintragen, Tage umbesetzen und das Team benachrichtigen. Die Anmeldung gilt 14 Tage und verlängert sich bei Nutzung.

### Mehrere Instanzen

Die App kann mehrere Schichtpläne speichern, z. B. von zwei Teams oder Arbeitgebern. Pushes werden dem richtigen Plan zugeordnet.

## Push-Nachrichten

Shiftplan kennt zwei Wege. Beide schickt dieselbe Instanz, Mitarbeitende entscheiden selbst, ob sie Benachrichtigungen wollen.

| | Im Browser (Web Push) | In der Shiftplan-App |
|---|---|---|
| Einschalten | Glocke im Kopf der Web-App | in der App unter Benachrichtigungen |
| Weg | Push-Dienst des Browserherstellers | Relay `push.shiftplan.info` → Firebase / APNs |
| Verschlüsselung | Ende-zu-Ende | Transportverschlüsselung, nicht Ende-zu-Ende |
| Planänderungen | mit Namen („neu: …, entfällt: …“) | nur Woche und Schicht, keine Namen |
| Einrichtung | nichts nötig, Schlüssel erzeugt die Instanz selbst | nichts nötig, Registrierung automatisch |
| iPhone | ab iOS 16.4, nur als Web-App auf dem Home-Bildschirm | normal über die App |

### Wann Pushes kommen

- Planänderungen in der aktuellen und der nächsten Kalenderwoche, gebündelt (eine Nachricht pro Minute Bearbeitung). Langfristige Planung löst keine Pushes aus.
- Ausfallmeldungen an das Team, z. B. „Anna Weber fällt Do. 08.10. aus – Frühschicht offen“. Den Grund enthält eine Nachricht nie. Die Person, die fehlt, bekommt die Nachricht nicht selbst.
- Freie Nachrichten der Planung über „Team benachrichtigen“.

In der App wählt jede Person zwischen „Alle“ Schichten und „Nur meine“.

### Warum App-Pushes über ein Relay laufen

Push-Nachrichten an eine App im App Store oder bei Google Play kann nur senden, wer die Zugangsdaten zum Firebase-Projekt dieser App hat. Die liegen bei ES Software und können nicht an jede Instanz verteilt werden. Deshalb nimmt das Relay `push.shiftplan.info` die Nachricht deiner Instanz an und gibt sie an Firebase Cloud Messaging weiter, für iPhones weiter an Apples APNs.

Ein eigenes Relay ist mit der offiziellen App nicht möglich, weil die Geräte-Tokens an das Firebase-Projekt der App gebunden sind.

### Was dabei passiert

1. Ein Gerät aktiviert in der App Benachrichtigungen. Die App meldet ihr Geräte-Token an deine Instanz. Es liegt nur in deiner Datenbank.
2. Beim ersten Push registriert sich deine Instanz automatisch beim Relay. Sie schickt dabei den Namen aus „Name in der App“ und ihre HTTPS-Adresse. Das Relay antwortet mit einer Instanz-ID und einem Secret, die Instanz speichert beides in ihrer Admin-Datenbank.
3. Für jeden Push schickt die Instanz Titel, Text, die Geräte-Tokens und einen Link in die App (Kalenderwoche) an das Relay. Das Relay gibt sie an Firebase weiter und meldet ungültige Tokens zurück. Die Instanz löscht diese Geräte dann.

Das Relay speichert:

- pro Instanz: ID, Hash des Secrets, Name, Adresse, Status, Tageslimit, Zeitpunkt des letzten Versands
- Tageszähler

Es speichert keine Nachrichteninhalte und keine Geräte-Tokens, die Logs enthalten nur Zähler.

Solange kein Gerät in der App Benachrichtigungen aktiviert hat, nimmt die Instanz keinen Kontakt zum Relay auf.

### Limits

| Limit | Wert |
|---|---|
| Registrierungen pro IP-Adresse und Stunde | 5 |
| Sendeaufrufe pro Instanz und Minute | 30 |
| Push-Empfänger pro Instanz und Tag | 5.000 |

Ein Sendeaufruf erreicht bis zu 500 Geräte. Für kleine und mittlere Teams reicht das bei Weitem. Wer mehr braucht: support@es-software.eu.

### App-Pushes abschalten

```env
SHIFTPLAN_PUSH_RELAY_URL=off
```

Danach `docker compose up -d`. Die App funktioniert weiter, zeigt Änderungen aber erst beim Öffnen. Web Push im Browser bleibt davon unberührt.

### Firewall

| Richtung | Ziel | Zweck |
|---|---|---|
| eingehend | 443 auf den Reverse Proxy | Browser und App |
| ausgehend | `push.shiftplan.info:443` | App-Pushes |
| ausgehend | Push-Dienste der Browser, z. B. `fcm.googleapis.com`, `*.push.apple.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com` | Web Push |
| ausgehend | `openholidaysapi.org:443` | Feiertage und Schulferien |

## Datenschutz und Impressum

Wer selbst betreibt, ist für die Daten der eigenen Instanz verantwortlich.

- Impressum und Datenschutzerklärung liefert Shiftplan unter `/impressum` und `/datenschutz` mit. Die Angaben zum Verantwortlichen kommen aus den `NUXT_PUBLIC_IMPRINT_*`-Variablen.
- Die mitgelieferte Datenschutzerklärung beschreibt Kontaktformular, Cookies, Statistik, Web Push, das Push-Relay mit Firebase und APNs sowie die OpenHolidays API. Mit `NUXT_PUBLIC_PRIVACY_CLOUDFLARE=true` nennt sie zusätzlich Cloudflare.
- Bei App-Pushes laufen Titel und Text über das Relay von ES Software sowie über Google und Apple. Automatische Hinweise auf Planänderungen enthalten nur Kalenderwoche und Schicht. Ausfallmeldungen enthalten Name, Tag und Schicht, nie den Grund. Freie Nachrichten der Planung enthalten deren Text.
- Wenn das für euch nicht passt, App-Pushes mit `SHIFTPLAN_PUSH_RELAY_URL=off` abschalten.
- Prüft, ob die mitgelieferte Datenschutzerklärung zu eurem Einsatz passt (Beschäftigungskontext, Betriebsrat, eigene Dienste wie Cloudflare). Sie ersetzt keine Rechtsberatung.

## Updates

```bash
cd /opt/stacks/shiftplan
docker compose pull
docker compose up -d
docker image prune -f
```

Datenbank-Migrationen laufen beim Start automatisch. Vor größeren Versionssprüngen ein Backup machen. Neue Versionen und Änderungen stehen unter [Releases](https://github.com/Eric-Schubert/Shiftplan/releases).

Automatisch aktualisieren lässt sich die Instanz z. B. mit Watchtower. Wer lieber selbst entscheidet, pinnt eine Version im `image:` und hebt sie bewusst an.

## Backups

Alle Daten liegen in `./db`: `db.sqlite` (Plan, Mitarbeitende, Schichten, Ausfälle) und `admin.sqlite` (Benutzer, Sitzungen, Geräte, Einstellungen, Relay-Zugang). SQLite läuft im WAL-Modus, deshalb den Container für ein konsistentes Backup kurz stoppen:

```bash
cd /opt/stacks/shiftplan
docker compose stop
tar czf "/opt/backups/shiftplan-$(date +%F).tar.gz" db
docker compose start
```

Das dauert wenige Sekunden. Als nächtlicher Cronjob (`/etc/cron.d/shiftplan-backup`):

```cron
30 3 * * * root cd /opt/stacks/shiftplan && docker compose stop -t 10 && tar czf /opt/backups/shiftplan-$(date +\%F).tar.gz db; docker compose start
```

Wiederherstellen:

```bash
cd /opt/stacks/shiftplan
docker compose stop
mv db db.alt
tar xzf /opt/backups/shiftplan-2026-10-08.tar.gz
chown -R 1000:1000 db
docker compose start
```

Backups außerhalb des Servers aufbewahren. Sie enthalten personenbezogene Daten.

## Alle Umgebungsvariablen

| Variable | Zweck | Standard |
|---|---|---|
| `SHIFTPLAN_ADMIN_PASSWORD` | Start-Passwort für `admin`, nur beim ersten Start | – (Pflicht beim ersten Start) |
| `SHIFTPLAN_TRUST_PROXY_HEADERS` | Client-IP aus `X-Forwarded-For` übernehmen | `false` |
| `SHIFTPLAN_PUSH_RELAY_URL` | Relay für App-Pushes, `off` schaltet sie ab | `https://push.shiftplan.info` |
| `SHIFTPLAN_PUSH_SUBJECT` | VAPID-Kontakt für Web Push | `mailto:` + Impressums-E-Mail |
| `SHIFTPLAN_BACKEND_CONFIG_PATH` | anderer Pfad für `backend.config.json` | `/app/config/backend.config.json` |
| `TZ` | Zeitzone | `UTC` |
| `NUXT_PUBLIC_IMPRINT_*` | Impressum und Verantwortlicher | leer |
| `NUXT_PUBLIC_PRIVACY_CLOUDFLARE` | Cloudflare in der Datenschutzerklärung nennen | `false` |
| `CONTACT_MAIL_*` | Benachrichtigung über das Kontaktformular per Microsoft Graph | aus |
| `NUXT_PUBLIC_DEMO_LOGIN_*`, `SHIFTPLAN_DEMO_MEMBER_*` | nur für öffentliche Demos | aus |

## Fehlersuche

**Die App sagt „Bitte eine gültige Adresse eingeben“ oder findet die Instanz nicht.**
Adresse ohne Pfad eingeben (`plan.example.de`). Vom Handy im Mobilfunknetz `https://plan.example.de` im Browser öffnen: Kommt ein Zertifikatsfehler oder keine Antwort, liegt es an DNS, Firewall oder Zertifikat.

**Der QR-Code öffnet `localhost` oder eine interne IP.**
Der Code wurde über eine interne Adresse erzeugt. Einstellungen über `https://plan.example.de` öffnen und den Code neu erzeugen.

**„Der Code ist ungültig, abgelaufen oder wurde schon benutzt.“**
Ein QR-Code gilt 7 Tage und nur einmal. Unter App-Zugänge einen neuen erzeugen.

**Die App bekommt keine Pushes.**

1. In der App prüfen, ob Benachrichtigungen an sind und ob „Nur meine“ gewählt ist.
2. Auf dem Handy die Systemeinstellung für Mitteilungen der App prüfen.
3. Im Log der Instanz nachsehen:

   ```bash
   docker compose logs shiftplan | grep "\[push\]"
   ```

   - `Relay-Registrierung fehlgeschlagen`: Die Instanz erreicht `push.shiftplan.info` nicht (ausgehende Firewall, DNS, Proxy) oder hat das Registrierungslimit erreicht. Test: `docker compose exec shiftplan wget -qO- https://push.shiftplan.info/healthz`
   - `Relay-Versand fehlgeschlagen: Relay responded with 429`: Limit erreicht, später erneut oder support@es-software.eu.
   - `Relay responded with 403`: Die Instanz ist beim Relay gesperrt, support@es-software.eu.
4. Pushes kommen nur für Änderungen in der aktuellen und der nächsten Woche.

**Web Push im Browser kommt nicht.**
Web Push braucht HTTPS. Auf dem iPhone muss die Seite über Teilen → Zum Home-Bildschirm installiert sein (iOS 16.4 oder neuer), die Glocke dann in der installierten Web-App antippen.

**Login wird nach wenigen Versuchen gesperrt, obwohl nur eine Person sich vertippt.**
Ohne `SHIFTPLAN_TRUST_PROXY_HEADERS=true` sieht die Instanz hinter einem Proxy alle Anfragen von der IP des Proxys. Variable setzen und neu starten.

**Container startet nicht, Log zeigt `SQLITE_CANTOPEN` oder `permission denied`.**
`sudo chown -R 1000:1000 /opt/stacks/shiftplan/db`

**Fragen und Fehler:** [GitHub Issues](https://github.com/Eric-Schubert/Shiftplan/issues) oder support@es-software.eu.
