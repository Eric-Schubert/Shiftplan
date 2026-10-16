<script setup lang="ts">
import type { RetentionDays } from "~/shared/utils/retention";
import { periodText } from "~/utils/legal/en/durations";

defineProps<{
  retention: RetentionDays;
}>();
</script>

<template>
  <section
    aria-labelledby="kurz"
    class="mt-10 max-w-[44rem] rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6"
  >
    <h3 id="kurz" class="text-lg font-semibold text-[var(--text-1)]">The key points in brief</h3>
    <ul class="mt-4 divide-y divide-[var(--border-soft)] text-[0.9375rem] leading-6">
      <li class="py-3 first:pt-0">
        <strong class="text-[var(--text-1)]">Only planners see the reasons for absences.</strong>
        <span class="text-[var(--text-2)]">
          Anyone who can see the plan only learns who is absent. Reasons are deleted after {{ periodText(retention.absenceReasons) }}.</span
        >
      </li>
      <li class="py-3">
        <strong class="text-[var(--text-1)]">No account with an email address for staff members.</strong>
        <span class="text-[var(--text-2)]">
          Personal access in the app and the browser starts with a QR code from planners; after that, signing in with a short code and a PIN of your own
          choice also works. No email address or phone number is needed.</span
        >
      </li>
      <li class="py-3">
        <strong class="text-[var(--text-1)]">App notices about plan changes do not name anyone.</strong>
        <span class="text-[var(--text-2)]">
          They are not end-to-end encrypted and therefore only contain the week and the shift. Names only appear in absence reports, requests and messages
          from planners.</span
        >
      </li>
      <li class="py-3">
        <strong class="text-[var(--text-1)]">No advertising, no tracking.</strong>
        <span class="text-[var(--text-2)]">
          The application's own visit statistics do not store IP addresses in plain text and are cleaned up after
          {{ periodText(retention.analytics) }}. Apart from the push messages themselves, Google and Apple only receive technical data for the push
          registration, the update notice and (on Android) the QR scanner.</span
        >
      </li>
      <li class="py-3 last:pb-0">
        <strong class="text-[var(--text-1)]">Cookies only for sign-in, access and the chosen language.</strong>
        <span class="text-[var(--text-2)]"> They are technically necessary, which is why there is no cookie banner.</span>
      </li>
    </ul>
  </section>
</template>
