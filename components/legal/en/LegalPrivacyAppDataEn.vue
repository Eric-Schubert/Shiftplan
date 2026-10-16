<!-- How to delete the app's data. Store listings link to its id, so it stays "app-daten-loeschen". -->
<script setup lang="ts">
import type { RetentionDays } from "~/shared/utils/retention";
import { periodText } from "~/utils/legal/en/durations";

defineProps<{
  retention: RetentionDays;
}>();
</script>

<template>
  <LegalPrivacySection id="app-daten-loeschen">
    <p>This is how you remove the data that the Shiftplan app (iOS and Android) stores:</p>
    <ol>
      <li>
        In the app, tap Menü (menu) → Einstellungen (settings) → “Von diesem Gerät entfernen” (remove from this device), ideally before uninstalling. This
        signs the device out of the instance, deletes the app access and the push registration there and removes the cached plan immediately. Without a
        connection to the instance, the app only removes the data on the device; the access and push registration then end as described under Retention
        periods.
      </li>
      <li>
        Name, shifts, entered absences and requests belong to your team's shift plan. Your company's planners can delete them in Shiftplan by removing you
        as a staff member. This also removes the accesses assigned to you, your PIN and the push registrations assigned to you. They can remove individual
        absences; Shiftplan then permanently deletes them {{ periodText(retention.absenceReasons) }} after the day of absence.
      </li>
      <li>
        For instances under shiftplan.info, you can also request deletion from ES Software:
        <a href="mailto:support@es-software.eu">support@es-software.eu</a>. ES Software takes care of this within one month and coordinates with your
        team's planners regarding plan data. Self-hosted instances are managed by their respective operator.
      </li>
    </ol>
    <p>
      <!-- One period for both: REQUEST_MESSAGE_RETENTION_DAYS follows ABSENCE_REASON_RETENTION_DAYS. -->
      Independently of this, reasons and notes of absences as well as messages in requests are deleted automatically after
      {{ periodText(retention.absenceReasons) }}, entries in the audit log after {{ periodText(retention.auditLog) }}.
    </p>
  </LegalPrivacySection>
</template>
