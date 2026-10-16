<script setup lang="ts">
import type { RetentionDays } from "~/shared/utils/retention";
import { periodText } from "~/utils/legal/en/durations";

defineProps<{
  retention: RetentionDays;
}>();
</script>

<template>
  <LegalPrivacySection id="zweck">
    <p>
      Shiftplan is used to manage weekly planning, shifts, staff members, rotations and administrative settings. Only data that is required for operation,
      planning, security and getting in touch is processed.
    </p>
    <p>
      Where the application is used in an employment context, the respective employer processes the planning data for the performance of the employment
      relationship on the basis of Art. 6(1)(b) and (c) GDPR. The team's employer is then the controller for the planning data. Where the provider named
      under “Controller” operates the instance for an employer, it does so on that employer's behalf (Art. 28 GDPR).
    </p>
    <p>
      Staff members can report an absence for individual days or a period via the Shiftplan app or, after signing in personally, in the browser. The days,
      the shift and a category (annual leave, personal or other) are stored. No health information is requested. Only planners see the reason; anyone who
      can see the plan only learns that someone is absent. The reason and the note are deleted automatically
      {{ periodText(retention.absenceReasons) }} after the day of absence.
    </p>
  </LegalPrivacySection>

  <LegalPrivacySection id="daten">
    <p>Depending on use, the application processes in particular the following data:</p>
    <ul>
      <li>
        Names, short codes and part-time flags of staff members, shifts, rotation patterns, shift assignments and day changes, stating who entered them.
      </li>
      <li>User accounts, roles, sign-in times, session data and CSRF security data.</li>
      <li>Audit log: who entered assignments, day changes or absences and when, with the names of those involved, including actions by staff members.</li>
      <li>Contact details and messages from the contact form.</li>
      <li>
        Push subscriptions (delivery address at the browser's push service, keys and, with a personal sign-in, the link to the person), if notifications
        are turned on.
      </li>
      <li>
        Personal access in the app or in the browser: assigned person, short code, PIN (only as a hash), device name (in the browser derived from the
        browser and operating system, e.g. “Firefox on macOS”) and time of last use; in the app also the device token for push and the platform
        (iOS/Android).
      </li>
      <li>Absences: day, shift, category of the reason, an optional note from planners, who entered the absence and whether via the web or the app.</li>
      <li>
        Takeover and swap requests: persons involved, shift and period, optional message (including the additional text of an absence report when cover is
        being sought), status, and who decided and when.
      </li>
      <li>Technical data such as user agent, referrer domain and approximate location data, where the infrastructure transmits them.</li>
    </ul>
    <p>
      <strong>Who sees what:</strong> names, short codes, part-time flags, shifts, rotation, day changes and absences (without reason and note), each
      stating who entered them, can be seen by anyone with access to the plan. If a team access code is set, these are only people with the code, a
      personal access or a planner sign-in. Without a code, anyone who knows the address can read the plan. Open takeover requests with their message can
      be seen by all staff members who are signed in personally, swap requests only by those involved and by planners. The reason and note of an absence
      and the personal accesses can only be seen by planners, the audit log and contact requests only by administrators.
    </p>
  </LegalPrivacySection>
</template>
