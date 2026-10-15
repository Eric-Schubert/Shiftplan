# Push notifications

Part of the [self-hosting guide](README.md).

Shiftplan has two channels. The same instance sends both, and employees can switch notifications off at any time.

| | In the browser (web push) | In the Shiftplan app |
|---|---|---|
| Switching on | bell in the header of the web app | on after setup ("Alle", all), can be switched off in the app under notifications |
| Route | push service of the browser vendor | relay `push.shiftplan.info` → Firebase / APNs |
| Encryption | end-to-end | transport encryption, not end-to-end |
| Plan changes | with names ("neu: …, entfällt: …", new: …, dropped: …) | week and shift only, no names |
| Setup | nothing to do, the instance generates its keys itself | nothing to do, registration is automatic |
| iPhone | iOS 16.4 or later, only as a web app on the home screen | as usual through the app |

## When pushes are sent

- Plan changes in the current and the next calendar week, batched (one message per minute of editing). Long-term planning and corrections to past days do not trigger pushes.
- Absence notices to the team, for example "Anna Weber fällt Do. 08.10. aus – Frühschicht offen" (Anna Weber is absent Thu 08.10, early shift open). A message never contains the reason. The absent person does not receive the message.
- Takeover and swap requests and their acceptances and rejections, with name and optional message.
- Free-text messages from planners via "Team benachrichtigen" (Notify team).

In the app, each person chooses between "Alle" (all shifts) and "Nur meine" (only mine). Personal messages about requests only go to personal access (QR code, or short code and PIN). Devices signed in with the team code only (older app versions, custom clients) do not receive them.

## Why app pushes go through a relay

Only someone who holds the credentials for an app's Firebase project can send push notifications to that app from the App Store or Google Play. ES Software holds them, and they cannot be handed out to every instance. That is why the relay `push.shiftplan.info` accepts the message from your instance and passes it on to Firebase Cloud Messaging, which forwards it to Apple's APNs for iPhones.

A relay of your own is not possible with the official app, because the device tokens are bound to the app's Firebase project.

## What happens

1. After setup, notifications in the app are set to "Alle". The app registers its device token with your instance. The token is stored only in your database. The app itself fetches the token from Firebase or APNs on every start, even without a team set up; ES Software is responsible for that as the provider of the app.
2. On the first push, your instance registers with the relay automatically. It sends the name from "Name in der App" and its HTTPS address (`SHIFTPLAN_PUBLIC_URL`, otherwise the address through which the plan was last changed). The relay replies with an instance ID and a secret, and the instance stores both in its admin database.
3. For every push, the instance sends the title, the text, the device tokens and a link into the app (calendar week) to the relay. The relay passes them on to Firebase and reports invalid tokens back. The instance then deletes those devices.

The relay stores:

- per instance: ID, hash of the secret, name, address, status, daily limit, time of the last send
- daily counters

It stores no message content and no device tokens, and its logs contain only counters.

As long as no device has signed up for pushes through the app, the instance does not contact the relay.

## Limits

| Limit | Value |
|---|---|
| Registrations per IP address and hour | 5 |
| Send calls per instance and minute | 30 |
| Push recipients per instance and day | 5,000 |

One send call reaches up to 500 devices. That is plenty for small and medium-sized teams. If you need more: support@es-software.eu.

## Switching app pushes off

```env
SHIFTPLAN_PUSH_RELAY_URL=off
```

Then run `docker compose up -d`. The app keeps working, but only shows changes when it is opened. Web push in the browser is not affected.

## Firewall

| Direction | Destination | Purpose |
|---|---|---|
| inbound | 443 on the reverse proxy | browser and app |
| outbound | `push.shiftplan.info:443` | app pushes |
| outbound | browser push services, for example `fcm.googleapis.com`, `web.push.apple.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com` | web push |
| outbound | `openholidaysapi.org:443` | public and school holidays |

Next: [Privacy policy and imprint](privacy-imprint.md).
