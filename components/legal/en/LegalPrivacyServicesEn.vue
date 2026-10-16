<script setup lang="ts">
defineProps<{
  /** Hosting provider with address; empty when the operator runs the server themselves. */
  hoster: string;
  usesCloudflare: boolean;
  usesMicrosoft: boolean;
  appPush: boolean;
  defaultRelay: boolean;
  relayHost: string | null;
}>();
</script>

<template>
  <LegalPrivacySection id="dienste">
    <template v-if="hoster">
      <h4>Hosting</h4>
      <p>
        This application and its data are located on a server of {{ hoster }} in a data centre in Germany. The provider acts as a processor under Art. 28
        GDPR and processes the data only in order to provide the server. The legal basis is Art. 6(1)(f) GDPR; our legitimate interest lies in reliable
        operation.
      </p>
    </template>

    <template v-if="usesCloudflare">
      <h4>Delivery via Cloudflare</h4>
      <p>
        This application is delivered via the Cloudflare network (Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA). All requests pass
        through Cloudflare servers, which process technically necessary connection data such as IP address, time, requested address and browser identifier
        in order to deliver the page securely and fend off attacks. Cloudflare acts as a processor under Art. 28 GDPR. Cloudflare is certified under the
        EU-US Data Privacy Framework; transfers to the USA take place on the basis of the European Commission's adequacy decision (Art. 45 GDPR). The
        legal basis is Art. 6(1)(f) GDPR; our legitimate interest lies in secure and stable provision.
      </p>
    </template>

    <template v-if="usesMicrosoft">
      <h4>Email delivery via Microsoft 365</h4>
      <p>
        For notifications about contact requests, we use Microsoft 365 or Microsoft Graph (Microsoft Ireland Operations Limited, One Microsoft Place,
        South County Business Park, Leopardstown, Dublin 18, Ireland). Microsoft processes data in this context as a processor under Art. 28 GDPR.
        Microsoft is certified under the EU-US Data Privacy Framework; where data is transferred to the USA, this takes place on the basis of the European
        Commission's adequacy decision (Art. 45 GDPR).
      </p>
    </template>

    <h4>Notifications in the browser</h4>
    <p>
      Anyone who turns on notifications gives their consent to this in the browser (Art. 6(1)(a) GDPR, Section 25(1) TDDDG). The browser then registers
      with its manufacturer's push service, for example Google (Firebase Cloud Messaging), Apple, Mozilla or Microsoft. The application stores the
      delivery address supplied by the browser, the associated keys and, with a personal sign-in, the link to the person. Messages are delivered
      end-to-end encrypted via the push service; the service does not see the content, but does see technical data such as the time and the target device.
      These push services may process data in the USA; the providers base this on the EU-US Data Privacy Framework (Art. 45 GDPR) or on standard
      contractual clauses (Art. 46(2)(c) GDPR). Notifications contain the shift, day or calendar week, names and, where applicable, additional texts from
      absence reports, requests or messages from planners, but never the recorded reason for an absence. Consent can be withdrawn at any time via the bell
      in the application or in the browser settings.
    </p>

    <LegalPrivacyAppServicesEn :app-push="appPush" :default-relay="defaultRelay" :relay-host="relayHost" />
    <LegalPrivacyAppScanEn />

    <h4>Public holidays and school holidays</h4>
    <p>
      Public holidays and school holidays are retrieved on the server via the OpenHolidays API. No names, contact requests or shift assignments are
      transmitted to OpenHolidays in the process; the query essentially contains the year, the period and the federal state.
    </p>
  </LegalPrivacySection>
</template>
