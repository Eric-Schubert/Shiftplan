<script setup lang="ts">
defineProps<{
  usesCloudflare: boolean;
  usesMicrosoft: boolean;
  appPush: boolean;
  defaultRelay: boolean;
  relayHost: string | null;
}>();
</script>

<template>
  <LegalPrivacySection id="dienste">
    <template v-if="usesCloudflare">
      <h4>Auslieferung über Cloudflare</h4>
      <p>
        Diese Anwendung wird über das Netzwerk von Cloudflare ausgeliefert (Cloudflare, Inc.,
        101 Townsend St., San Francisco, CA 94107, USA). Alle Aufrufe laufen über Server von
        Cloudflare, die dabei technisch notwendige Verbindungsdaten wie IP-Adresse, Zeitpunkt,
        aufgerufene Adresse und Browser-Kennung verarbeiten, um die Seite sicher auszuliefern
        und Angriffe abzuwehren. Cloudflare handelt als Auftragsverarbeiter nach Art. 28 DSGVO.
        Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert; Übermittlungen in
        die USA erfolgen auf Grundlage des Angemessenheitsbeschlusses der EU-Kommission (Art. 45
        DSGVO). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse
        liegt in einer sicheren und stabilen Bereitstellung.
      </p>
    </template>

    <template v-if="usesMicrosoft">
      <h4>E-Mail-Zustellung über Microsoft 365</h4>
      <p>
        Für die Benachrichtigung über Kontaktanfragen nutzen wir Microsoft 365 beziehungsweise
        Microsoft Graph (Microsoft Ireland Operations Limited, One Microsoft Place, South County
        Business Park, Leopardstown, Dublin 18, Irland). Microsoft verarbeitet Daten dabei als
        Auftragsverarbeiter nach Art. 28 DSGVO. Microsoft ist unter dem EU-US Data Privacy
        Framework zertifiziert; soweit Daten in die USA übermittelt werden, erfolgt dies auf
        Grundlage des Angemessenheitsbeschlusses der EU-Kommission (Art. 45 DSGVO).
      </p>
    </template>

    <h4>Benachrichtigungen im Browser</h4>
    <p>
      Wer Benachrichtigungen aktiviert, erteilt dafür im Browser eine Einwilligung (Art. 6
      Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Der Browser meldet sich dann beim Push-Dienst
      seines Herstellers an, zum Beispiel Google (Firebase Cloud Messaging), Apple, Mozilla
      oder Microsoft. Die Anwendung speichert die vom Browser gelieferte Zustelladresse, die
      zugehörigen Schlüssel und, bei persönlicher Anmeldung, die Zuordnung zur Person.
      Nachrichten werden Ende-zu-Ende verschlüsselt über den Push-Dienst zugestellt; der Dienst
      sieht den Inhalt nicht, aber technische Daten wie Zeitpunkt und Zielgerät. Diese
      Push-Dienste können Daten in den USA verarbeiten; die Anbieter stützen das auf das EU-US
      Data Privacy Framework (Art. 45 DSGVO) bzw. auf Standardvertragsklauseln (Art. 46 Abs. 2
      lit. c DSGVO).
      Benachrichtigungen enthalten Schicht, Tag oder Kalenderwoche, Namen und gegebenenfalls
      Zusatztexte aus Ausfallmeldungen, Anfragen oder Nachrichten der Planung, aber nie den
      erfassten Grund eines Ausfalls. Die Einwilligung lässt sich jederzeit über die Glocke in
      der Anwendung oder in den Browser-Einstellungen widerrufen.
    </p>

    <LegalPrivacyAppServices :app-push="appPush" :default-relay="defaultRelay" :relay-host="relayHost" />
    <LegalPrivacyAppScan />

    <h4>Feiertage und Schulferien</h4>
    <p>
      Feiertage und Schulferien werden serverseitig über die OpenHolidays API abgerufen. Dabei
      werden keine Namen, Kontaktanfragen oder Schichtzuweisungen an OpenHolidays übertragen;
      die Abfrage enthält im Wesentlichen Jahr, Zeitraum und Bundesland.
    </p>
  </LegalPrivacySection>
</template>
