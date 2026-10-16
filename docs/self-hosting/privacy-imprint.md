# Privacy policy and imprint

Part of the [self-hosting guide](README.md).

If you run your own instance, you are responsible for the data in it.

- Shiftplan ships an imprint and a privacy policy at `/impressum` and `/datenschutz` (also reachable as `/imprint` and `/privacy`). Both are in German, which is the legally binding version, and in English as a translation for visitors who use the English UI. The details of the controller come from the `NUXT_PUBLIC_IMPRINT_*` variables.
- The English version is fed from the same settings as the German one: the `NUXT_PUBLIC_IMPRINT_*` and `NUXT_PUBLIC_PRIVACY_*` variables, the push relay and the retention periods. There is nothing extra to configure. Values you set, such as the hosting provider or the country, appear as written in both languages.
- The bundled privacy policy covers the contact form, cookies, statistics, web push, the app (push registration, QR scan, update notice) and the OpenHolidays API. For processing within the app itself, it names ES Software as the controller. With `NUXT_PUBLIC_PRIVACY_CLOUDFLARE=true` it also lists Cloudflare for delivering the instance, with `NUXT_PUBLIC_PRIVACY_HOSTER` the hosting provider of the server, and with `CONTACT_MAIL_*` values set, Microsoft 365.
- It describes the route of app pushes according to `SHIFTPLAN_PUSH_RELAY_URL`: when it is not set, the relay `push.shiftplan.info` (at netcup, behind Cloudflare) with Firebase and APNs; with a custom URL, that URL's host; with `off` or an empty value, that the instance sends no app pushes.
- With app pushes, title and text pass through the ES Software relay, Cloudflare, and Google and Apple. Automatic notices about plan changes only contain the calendar week and the shift. Absence notices contain the name, the day or period, the shift and an optional extra text, never the reason. Takeover and swap requests contain the name, the shift or period and an optional message; free-text messages from planners contain their text.
- If that does not work for you, switch app pushes off with `SHIFTPLAN_PUSH_RELAY_URL=off`.
- Check whether the bundled privacy policy fits your use (employment context, works council, your own services such as Cloudflare, access logs of your reverse proxy). The retention period it states for access logs only applies to instances under shiftplan.info. The instance itself deletes contact requests after one year and removed absences 90 days after the absence date. The bundled privacy policy is no substitute for legal advice.

The variables are listed in [Environment variables](environment-variables.md), the privacy settings in more detail in [Configuration](../configuration.md#privacy-policy).

Next: [Operations](operations.md).
