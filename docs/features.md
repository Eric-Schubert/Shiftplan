# Features

## Roles

| Role | Can View | Can Plan | Can Manage |
|------|----------|----------|------------|
| Public / Team | Weekly plan, shifts, rotation (with the access code if one is set) | No | No |
| Planner | Everything from the public view | Assign shifts, import/generate rotations | No |
| Admin | Everything | Everything | Users, staff, shifts, settings |

## Team Access And Push Notifications

Admins can set a team access code under **Settings → Team-Zugang**. Without a code, the plan stays readable for everyone with the link. With a code, employees scan the QR code or enter the code once and stay signed in on that device for up to 180 days. They can only read the plan; changes still need a planner or admin login. A new code signs out every employee device and removes all push subscriptions, for example when someone leaves the team.

Employees enable notifications with the bell in the header. Shiftplan then pushes:

- manual assignments and removals in the current or next calendar week, bundled into one message per minute of editing
- free-text messages that planners send with **Team benachrichtigen**

Push uses the browser's Web Push service with VAPID keys that each instance generates on first use and stores in the admin database. No central push server or app store account is needed. On iPhones, notifications require iOS 16.4 or later and the web app added to the home screen via Share → Add to Home Screen. Push needs HTTPS (localhost works for development).

Pushes to the native Shiftplan app go through the push relay at `https://push.shiftplan.info`, which forwards them to Firebase Cloud Messaging. The instance registers itself with the relay the first time an app device needs a push and stores the credentials in the admin database. Automatic plan-change pushes to the app never contain staff names, only calendar weeks and shifts; absence reports and requests name the person who triggered them. Nothing is sent to the relay as long as no app device is registered. Settings are described in [Configuration](configuration.md#push-notifications).

## Personal App Access And Absences

Planners create a personal QR code for one employee (`POST /api/member-invites`). The Shiftplan app or a browser redeems it once within 7 days and receives a session bound to that person, so nobody can act as someone else. On the first sign-in the employee sets a PIN (6 to 12 digits) and from then on signs in on any device with Kürzel and PIN (`POST /api/member/login`). Every employee gets a Kürzel from their initials, editable under Mitarbeiter. Wrong PINs are rate-limited per network and per Kürzel; planners can reset a forgotten PIN. Browsers keep the session in an HttpOnly cookie and writes must come from the same origin. Planners see and revoke devices. Revoking or signing out deletes the session together with the push registration of that app or browser. Removing or deactivating an employee deletes all their sessions, their PIN, open invites and push registrations at once. Sessions unused for 365 days are deleted.

Employees report their own absence for one day or a range of up to 8 weeks (vacation, private, other), also for weeks that are not planned yet. The shift counts as open on those days, and the team gets one push such as "Anna Weber fällt Do. 08.10. aus – Frühschicht offen". The reason is only visible to planners and is deleted 90 days after the absence date. Every change made in the app appears in the audit log as "über App". Messages in takeover and swap requests are cleared 90 days after the last day of the request, audit log entries are deleted after two years.

Signed-in employees can do the same in the browser as in the app: see their shifts highlighted, report absences, give away a shift and take over or swap shifts.

The weekly plan stays the basis; planners can additionally put someone into or out of a shift for a single day (`POST /api/shiftplan/day-change`), in the web app via **Tage** on a shift.

Planners can sign in to the app with `client: "app"` and get a Bearer token valid for 14 days with sliding renewal. Requests with a Bearer token need no CSRF token. See [API](api.md).

## Rotation Planning With Excel

Planners and admins can maintain rotation patterns with an Excel file:

1. Download the Excel template in settings.
2. Read the instructions in the first sheet.
3. Check the start year, start week, and cycle length.
4. Fill or adjust the template weeks.
5. Import the file again.
6. Generate the shift plan from the new pattern.

Internal IDs are not exposed for editing in the template. The visible fields are designed so the file can be edited without technical knowledge.

## Version History

The version history is available in the app through the version indicator in the header.
