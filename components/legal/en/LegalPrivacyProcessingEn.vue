<script setup lang="ts">
import { LOCALE_COOKIE_MAX_AGE } from "~/i18n/config";
import type { RetentionDays } from "~/shared/utils/retention";
import type { PrivacyFacts } from "~/types/privacy";
import { daysText, minutesText, periodText } from "~/utils/legal/en/durations";

defineProps<{
  usesMicrosoft: boolean;
  retention: RetentionDays;
  session: PrivacyFacts["session"];
}>();

const localeCookieDays = LOCALE_COOKIE_MAX_AGE / (24 * 60 * 60);
</script>

<template>
  <LegalPrivacySection id="kontakt">
    <p>
      If the contact form is used, we store the name, reply contact, subject and message in order to be able to process the request. In addition, the
      application stores a hash formed from the IP address and user agent, as well as the user agent, in order to limit misuse and keep contact requests
      traceable.
    </p>
    <p v-if="usesMicrosoft">
      We send notifications of new requests by email via Microsoft 365 (Microsoft Graph). In the process, the name, reply contact, subject and message are
      transmitted to Microsoft. If the reply contact is a valid email address, we use it as the reply-to address.
    </p>
    <p>
      The legal basis is Art. 6(1)(b) GDPR if the request is aimed at a contract or pre-contractual measures, otherwise Art. 6(1)(f) GDPR. Our legitimate
      interest lies in processing incoming requests and in the secure operation of the contact form.
    </p>
  </LegalPrivacySection>

  <LegalPrivacySection id="cookies">
    <p>
      For protected areas, the application sets technically necessary cookies. The cookie <code>{{ session.cookieName }}</code> keeps the planner sign-in
      active for up to {{ minutesText(session.durationMinutes) }} and cannot be read by JavaScript. The cookie
      <code>{{ session.csrfCookieName }}</code> protects forms and API calls against misuse and is valid for the same length of time. These cookies are
      strictly necessary for signing in and therefore do not require consent under Section 25(2) no. 2 of the German Telecommunications Digital Services
      Data Protection Act (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz, TDDDG).
    </p>
    <p>
      If the shift plan is protected by a team access code, the application sets the cookie <code>viewer_token</code> once the code has been entered. It
      only allows the plan to be read, cannot be read by JavaScript and is valid for up to {{ daysText(retention.viewerSession) }}. This cookie is also
      technically necessary (Section 25(2) no. 2 TDDDG).
    </p>
    <p>
      If someone signs in personally in the browser (short code and PIN or invitation link), the application sets the cookie
      <code>member_token</code>. It cannot be read by JavaScript, is valid for up to {{ daysText(retention.memberCookie) }} and is deleted on signing out.
      This cookie is also technically necessary (Section 25(2) no. 2 TDDDG).
    </p>
    <p>
      If someone chooses a language in the footer, the application stores this choice for {{ periodText(localeCookieDays) }} in the cookie
      <code>shiftplan_locale</code>; without such a choice it is not set, and as an expressly requested setting it is technically necessary (Section 25(2)
      no. 2 TDDDG).
    </p>
    <p>
      Failed sign-in attempts are limited in order to detect attacks. For this purpose, the IP address may be processed temporarily in a rate-limit table.
      The legal basis is Art. 6(1)(f) GDPR; our interest lies in access protection, the prevention of misuse and the stability of the application.
    </p>
    <p>
      When a page is requested, the server processes technically necessary connection data (IP address, time, requested address, browser identifier) in
      order to deliver the page. For instances under shiftplan.info, the upstream web server (reverse proxy) stores this data together with the status
      code in access logs in order to find errors and fend off attacks, and deletes it after 15 days at the latest. The legal basis is Art. 6(1)(f) GDPR.
    </p>
  </LegalPrivacySection>

  <LegalPrivacySection id="lokal">
    <p>
      Two convenience settings are stored locally in the browser: the chosen light or dark mode and whether the notice about notifications has been
      dismissed. These values remain on the device and are not used for advertising or external tracking.
    </p>
    <p>
      The Shiftplan app stores on the device the team's address, the selected name, the notification choice, a dismissed update notice, after a planner
      sign-in the username and role and, until deregistration from the instance has succeeded, the device token of a team for which notifications have
      been turned off. The access keys are kept in the Keychain (iOS) or the Android Keystore. So that the plan can still be read without a network
      connection, the app also keeps the most recently loaded weekly plans with the names of the team; it removes weeks that are more than two weeks in
      the past the next time it loads. The app does not store passwords, PINs or reasons for absences. How this data can be removed is explained under
      <a href="#app-daten-loeschen">Deleting app data</a>. ES Software, as the provider of the app, is the controller for the processing in the app (see
      <a href="#dienste">External services</a>).
    </p>
    <p>This storage is necessary for the requested settings and for the app (Section 25(2) no. 2 TDDDG).</p>
  </LegalPrivacySection>

  <LegalPrivacySection id="statistik">
    <p>
      The application records page views in order to evaluate usage and technical stability. It stores the date, page path, user agent, referrer domain,
      optionally approximate location data from infrastructure headers, and an HMAC hash of the IP address and user agent that changes daily. The IP
      address is not stored in plain text in the statistics database.
    </p>
    <p>
      The statistics are not used for advertising. They are automatically limited to a maximum of {{ periodText(retention.analytics) }}. The legal basis
      is Art. 6(1)(f) GDPR; our legitimate interest lies in operating the application securely, traceably and in line with demand.
    </p>
    <p>If Do Not Track is enabled in the browser, no page view is sent to the statistics route.</p>
  </LegalPrivacySection>
</template>
