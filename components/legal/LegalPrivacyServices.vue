<script setup lang="ts">
defineProps<{
  usesCloudflare: boolean;
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

    <h4>E-Mail-Zustellung über Microsoft 365</h4>
    <p>
      Für die E-Mail-Zustellung kann Microsoft 365 beziehungsweise Microsoft Graph genutzt
      werden (Microsoft Ireland Operations Limited, One Microsoft Place, South County Business
      Park, Leopardstown, Dublin 18, Irland). Microsoft verarbeitet Daten dabei als
      Auftragsverarbeiter nach Art. 28 DSGVO. Microsoft ist unter dem EU-US Data Privacy
      Framework zertifiziert; soweit Daten in die USA übermittelt werden, erfolgt dies auf
      Grundlage des Angemessenheitsbeschlusses der EU-Kommission (Art. 45 DSGVO).
    </p>

    <h4>Benachrichtigungen im Browser</h4>
    <p>
      Wer Benachrichtigungen aktiviert, erteilt dafür im Browser eine Einwilligung (Art. 6
      Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Der Browser meldet sich dann beim Push-Dienst
      seines Herstellers an, zum Beispiel Google (Firebase Cloud Messaging), Apple, Mozilla
      oder Microsoft. Die Anwendung speichert nur die vom Browser gelieferte Zustelladresse und
      die zugehörigen Schlüssel. Nachrichten werden Ende-zu-Ende verschlüsselt über den
      Push-Dienst zugestellt; der Dienst sieht den Inhalt nicht, aber technische Daten wie
      Zeitpunkt und Zielgerät. Benachrichtigungen enthalten Schicht, Kalenderwoche und Namen
      der betroffenen Mitarbeitenden, aber keine Gründe für Änderungen. Die Einwilligung lässt
      sich jederzeit über die Glocke in der Anwendung oder in den Browser-Einstellungen
      widerrufen.
    </p>

    <h4>Benachrichtigungen in der Shiftplan-App</h4>
    <p>
      Nutzt jemand die Shiftplan-App mit Benachrichtigungen, laufen Pushes über den
      Push-Dienst push.shiftplan.info von ES Software und Firebase Cloud Messaging (Google
      Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland), auf iPhones zusätzlich
      über den Apple Push Notification Service. Diese Nachrichten sind nicht
      Ende-zu-Ende-verschlüsselt. Automatische Hinweise auf Planänderungen enthalten deshalb
      nur Kalenderwoche und Schicht, keine Namen. Meldet jemand einen Ausfall, erfährt das Team
      Name, Tag und Schicht, aber nie den Grund. Nachrichten der Planung an das Team enthalten
      deren Text. Der Push-Dienst speichert weder Inhalte noch Gerätetokens.
    </p>
    <p>
      Google ist unter dem EU-US Data Privacy Framework zertifiziert; soweit Daten in die USA
      übermittelt werden, erfolgt dies auf Grundlage des Angemessenheitsbeschlusses der
      EU-Kommission (Art. 45 DSGVO). Rechtsgrundlage ist die Einwilligung beim Aktivieren der
      Benachrichtigungen in der App (Art. 6 Abs. 1 lit. a DSGVO), widerrufbar in der App oder
      in den Systemeinstellungen.
    </p>

    <h4>Feiertage und Schulferien</h4>
    <p>
      Feiertage und Schulferien werden serverseitig über die OpenHolidays API abgerufen. Dabei
      werden keine Namen, Kontaktanfragen oder Schichtzuweisungen an OpenHolidays übertragen;
      die Abfrage enthält im Wesentlichen Jahr, Zeitraum und Bundesland.
    </p>
  </LegalPrivacySection>
</template>

<style scoped>
.privacy-body h4 {
  margin: 1.5rem 0 0.375rem;
  color: var(--text-1);
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}
</style>
