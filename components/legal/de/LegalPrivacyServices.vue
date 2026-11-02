<script setup lang="ts">
import { localeTag } from "~/i18n/config";
import { regionName } from "~/shared/utils/format/region";

const props = defineProps<{
  /** Hosting provider with address; empty when the operator runs the server themselves. */
  hoster: string;
  /** ISO 3166 country code of the hoster's data centre (DE); empty when unknown, then the text names none. */
  hosterLocation: string;
  /** Site of the operator that loads Plausible Analytics (shiftplan.info); empty when none does. */
  plausibleSite: string;
  usesCloudflare: boolean;
  usesMicrosoft: boolean;
  appPush: boolean;
  defaultRelay: boolean;
  relayHost: string | null;
}>();

// The code in this language: „Deutschland“ / "Germany"; anything that is no code stays as written.
const location = computed(() => regionName(localeTag("de"), props.hosterLocation));
</script>

<template>
  <LegalPrivacySection id="dienste">
    <template v-if="hoster">
      <h4>Hosting</h4>
      <p>
        <template v-if="hosterLocation">
          Diese Anwendung und ihre Daten liegen auf einem Server von {{ hoster }} in einem Rechenzentrum in {{ location }}.
        </template>
        <template v-else>Diese Anwendung und ihre Daten liegen auf einem Server von {{ hoster }}.</template>
        Der Anbieter handelt als Auftragsverarbeiter nach Art. 28 DSGVO und verarbeitet die Daten nur, um den Server bereitzustellen. Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in einem zuverlässigen Betrieb.
      </p>
    </template>

    <template v-if="usesCloudflare">
      <h4>Auslieferung über Cloudflare</h4>
      <p>
        Diese Anwendung wird über das Netzwerk von Cloudflare ausgeliefert (Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA). Alle
        Aufrufe laufen über Server von Cloudflare, die dabei technisch notwendige Verbindungsdaten wie IP-Adresse, Zeitpunkt, aufgerufene Adresse und
        Browser-Kennung verarbeiten, um die Seite sicher auszuliefern und Angriffe abzuwehren. Cloudflare handelt als Auftragsverarbeiter nach Art. 28
        DSGVO. Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert; Übermittlungen in die USA erfolgen auf Grundlage des
        Angemessenheitsbeschlusses der EU-Kommission (Art. 45 DSGVO). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt
        in einer sicheren und stabilen Bereitstellung.
      </p>
    </template>

    <template v-if="plausibleSite">
      <h4>Reichweitenmessung auf {{ plausibleSite }} mit Plausible Analytics</h4>
      <p>
        Auf {{ plausibleSite }} nutzen wir Plausible Analytics (Plausible Insights OÜ, Västriku tn 2, 50403 Tartu, Estland), um Seitenaufrufe
        zusammengefasst auszuwerten. Der Browser lädt dafür ein Skript von plausible.io und übermittelt die aufgerufene Adresse, den Referrer, Browser,
        Betriebssystem und Gerätetyp sowie die IP-Adresse. Aus IP-Adresse und User-Agent bildet Plausible zusammen mit einem täglich wechselnden Salt
        einen Hash, um Besuche zu zählen. Rohe IP-Adressen und User-Agents speichert Plausible nicht; aus der IP-Adresse wird nur der ungefähre Standort
        (Land, Region, Stadt) abgeleitet. Plausible setzt keine Cookies, nutzt keinen Local Storage und legt keine dauerhaften Kennungen an. Die Daten
        werden in der EU verarbeitet. Plausible handelt als Auftragsverarbeiter nach Art. 28 DSGVO. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser
        berechtigtes Interesse liegt darin, die Reichweite von {{ plausibleSite }} zu verstehen.
      </p>
    </template>

    <template v-if="usesMicrosoft">
      <h4>E-Mail-Zustellung über Microsoft 365</h4>
      <p>
        Für die Benachrichtigung über Kontaktanfragen nutzen wir Microsoft 365 beziehungsweise Microsoft Graph (Microsoft Ireland Operations Limited, One
        Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland). Microsoft verarbeitet Daten dabei als Auftragsverarbeiter nach Art.
        28 DSGVO. Microsoft ist unter dem EU-US Data Privacy Framework zertifiziert; soweit Daten in die USA übermittelt werden, erfolgt dies auf
        Grundlage des Angemessenheitsbeschlusses der EU-Kommission (Art. 45 DSGVO).
      </p>
    </template>

    <h4>Benachrichtigungen im Browser</h4>
    <p>
      Wer Benachrichtigungen aktiviert, erteilt dafür im Browser eine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Der Browser meldet
      sich dann beim Push-Dienst seines Herstellers an, zum Beispiel Google (Firebase Cloud Messaging), Apple, Mozilla oder Microsoft. Die Anwendung
      speichert die vom Browser gelieferte Zustelladresse, die zugehörigen Schlüssel und, bei persönlicher Anmeldung, die Zuordnung zur Person.
      Nachrichten werden Ende-zu-Ende verschlüsselt über den Push-Dienst zugestellt; der Dienst sieht den Inhalt nicht, aber technische Daten wie
      Zeitpunkt und Zielgerät. Diese Push-Dienste können Daten in den USA verarbeiten; die Anbieter stützen das auf das EU-US Data Privacy Framework (Art.
      45 DSGVO) bzw. auf Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO). Benachrichtigungen enthalten Schicht, Tag oder Kalenderwoche, Namen und
      gegebenenfalls Zusatztexte aus Ausfallmeldungen, Anfragen oder Nachrichten der Planung, aber nie den erfassten Grund eines Ausfalls. Die
      Einwilligung lässt sich jederzeit über die Glocke in der Anwendung oder in den Browser-Einstellungen widerrufen.
    </p>

    <LegalPrivacyAppServices :app-push="appPush" :default-relay="defaultRelay" :relay-host="relayHost" />
    <LegalPrivacyAppScan />

    <h4>Feiertage und Schulferien</h4>
    <p>
      Feiertage und Schulferien werden serverseitig über die OpenHolidays API abgerufen. Dabei werden keine Namen, Kontaktanfragen oder Schichtzuweisungen
      an OpenHolidays übertragen; die Abfrage enthält im Wesentlichen Jahr, Zeitraum und Bundesland.
    </p>
  </LegalPrivacySection>
</template>
