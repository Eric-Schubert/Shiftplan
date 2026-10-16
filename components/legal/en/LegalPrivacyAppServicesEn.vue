<!-- Services the Shiftplan app (iOS and Android) talks to. Part of the "dienste" (services) section. -->
<script setup lang="ts">
const props = defineProps<{
  /** False when this instance sends nothing to the app (SHIFTPLAN_PUSH_RELAY_URL=off). */
  appPush: boolean;
  /** The instance uses ES Software's relay push.shiftplan.info (SHIFTPLAN_PUSH_RELAY_URL unset). */
  defaultRelay: boolean;
  relayHost: string | null;
}>();

const ownRelay = computed(() => props.appPush && props.defaultRelay);
</script>

<template>
  <h4>Shiftplan app</h4>
  <p>
    The Shiftplan app for iOS and Android is provided by ES Software (Eric Schubert, Dresden,
    <a href="https://es-software.eu" target="_blank" rel="noopener noreferrer">es-software.eu</a>,
    <a href="mailto:support@es-software.eu">support@es-software.eu</a>). ES Software is the controller for the processing in the app itself (local
    storage, registration with the push services, QR code scan, update notice), even if someone else operates this instance.
  </p>

  <h4>Notifications in the Shiftplan app</h4>
  <p>
    Notifications are initially off in the app. After a team has been set up, the app asks whether you want all notifications, only yours or none for now;
    on iPhones and from Android 13 onwards, the system then also asks. Only once you agree does the app register with Firebase Cloud Messaging (Google
    Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland), on iPhones additionally with the Apple Push Notification Service (Apple Inc., One
    Apple Park Way, Cupertino, CA 95014, USA), receive a device token and report it to this instance. In the process, Google or Apple receives an
    identifier of the app installation stored on the device, app and device information and the IP address, but no data from Shiftplan. If you turn off
    notifications for all teams, the app deletes the device token.
  </p>
  <p>
    App versions before 1.3.0 register with Firebase and Apple on every start, even without a team set up and with notifications turned off, and set
    notifications to “Alle” (all) after setup. Updating to the current version ends this.
  </p>
  <p v-if="ownRelay">
    This instance sends pushes to the app via ES Software's push service push.shiftplan.info, which runs on a server of netcup GmbH (Emmy-Noether-Straße
    10, 76131 Karlsruhe) in Germany and is reachable via the Cloudflare network (Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA), to
    Firebase Cloud Messaging and, on iPhones, on to Apple. netcup acts as a processor for ES Software in this context.
  </p>
  <p v-else-if="appPush">
    This instance sends pushes to the app via the {{ relayHost ? `push service ${relayHost}` : "push service" }} set up by the operator to Firebase Cloud
    Messaging (Google) and, on iPhones, on to Apple.
  </p>
  <p v-else>This instance does not send any pushes to the Shiftplan app.</p>
  <p v-if="appPush">
    These messages are encrypted in transit, but not end-to-end:
    {{ ownRelay ? "ES Software, Cloudflare" : "the operator of the push service" }}, Google and Apple can technically read the text. Automatic notices
    about plan changes therefore only contain the calendar week and the shift, no names. Names only appear in messages that someone deliberately triggers:
    absence reports (name, day or period, shift, optionally an additional text, never the recorded reason), takeover and swap requests (name, shift or
    period, optionally a message), their acceptance or rejection, and messages from planners. Health information therefore does not belong in these free
    texts.
    <template v-if="ownRelay">The push service stores neither content nor device tokens.</template>
  </p>
  <p>
    The legal basis is your consent (Art. 6(1)(a) GDPR, Section 25(1) TDDDG). You can withdraw it at any time: if you choose “Aus” (off) under
    “Benachrichtigungen” (notifications) for a team in the app, the instance deletes the device token and no longer sends anything to this device. If the
    instance cannot be reached at that moment, the app completes the deregistration later. In the system settings, the app's notifications can also be
    switched off entirely. For app versions before 1.3.0, the legal basis is Art. 6(1)(f) GDPR; the legitimate interest lies in informing teams about plan
    changes, absences and requests without any further action on their part. There, the app only reports that notifications have been turned off if it
    reaches the instance at that moment.
  </p>
  <p>
    Google may process the data in the USA. Google LLC
    {{ ownRelay ? "and Cloudflare, Inc. are" : "is" }} certified under the EU-US Data Privacy Framework; where data is transferred to the USA, this takes
    place on the basis of the European Commission's adequacy decision (Art. 45 GDPR). Apple may also process the data in the USA and bases this transfer
    on the European Commission's standard contractual clauses (Art. 46(2)(c) GDPR).
  </p>
</template>
