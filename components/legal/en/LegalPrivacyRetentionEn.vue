<script setup lang="ts">
import type { RetentionDays } from "~/shared/utils/retention";
import type { PrivacyFacts } from "~/types/privacy";
import { daysText, minutesText, periodText } from "~/utils/legal/en/durations";

defineProps<{
  retention: RetentionDays;
  session: PrivacyFacts["session"];
}>();
</script>

<template>
  <LegalPrivacySection id="speicherdauer">
    <p>Shift, request and user data is stored for as long as it is required for planning and administration. Fixed periods apply to certain data:</p>
    <dl class="privacy-terms">
      <dt>Planner sign-in</dt>
      <dd>
        ends in the browser at the latest {{ minutesText(session.durationMinutes) }} after the last activity, in the app after
        {{ daysText(retention.plannerApp) }} without use. Signing out ends it immediately.
      </dd>
      <dt>Login locks and rate limits</dt>
      <dd>are only kept temporarily.</dd>
      <dt>Access logs</dt>
      <dd>are deleted after 15 days at the latest for instances under shiftplan.info.</dd>
      <dt>Contact requests</dt>
      <dd>are deleted {{ periodText(retention.contactMessages) }} after receipt.</dd>
      <dt>Visit statistics</dt>
      <dd>are cleaned up after {{ periodText(retention.analytics) }} at the latest.</dd>
      <dt>Team access code</dt>
      <dd>
        Accesses are valid in the browser for up to {{ daysText(retention.viewerSession) }} from entering the code, in the app for up to
        {{ daysText(retention.viewerSession) }} after the last use; a new code ends all of them immediately.
      </dd>
      <dt>Push subscriptions and app device tokens</dt>
      <dd>
        are deleted as soon as notifications are turned off, the personal access of the device or browser ends, the access code is changed or the push
        service reports them as invalid. If the instance cannot be reached when notifications are turned off, the app completes the deregistration later;
        app versions before 1.3.0 do not do this, and there the token remains stored until one of the other cases occurs.
      </dd>
      <dt>Personal accesses (app and browser)</dt>
      <dd>
        are valid until the device or browser signs out, planners block the access or remove or deactivate the person, and are then deleted. In the
        browser, the sign-in ends at the latest {{ daysText(retention.memberCookie) }} after signing in; accesses that have not been used for
        {{ daysText(retention.memberIdle) }} are deleted. A QR code that has not been redeemed expires after {{ daysText(retention.memberInvite) }}.
      </dd>
      <dt>Removed or deactivated staff members</dt>
      <dd>
        Their personal accesses, their PIN, open QR codes and the push registrations assigned to them are deleted immediately, and open requests are
        withdrawn. Read accesses and push registrations via the team link without a name are not affected; they end as described above, immediately for
        example with a new team access code. On removal, their shifts, rotation entries, absences, day changes and requests are also deleted.
      </dd>
      <dt>Reasons and notes of absences</dt>
      <dd>are deleted {{ periodText(retention.absenceReasons) }} after the day of absence.</dd>
      <dt>Removed absences</dt>
      <dd>are permanently deleted {{ periodText(retention.absenceReasons) }} after the day of absence.</dd>
      <dt>Messages in requests</dt>
      <dd>are deleted {{ periodText(retention.requestMessages) }} after the last day of the request.</dd>
      <dt>Audit log</dt>
      <dd>
        Entries are deleted automatically after {{ periodText(retention.auditLog) }}. Until then, the name remains in it even if the person has been
        removed from the plan.
      </dd>
    </dl>
  </LegalPrivacySection>

  <LegalPrivacyAppDataEn :retention="retention" />
</template>

<style scoped src="~/assets/legal-terms.css"></style>
