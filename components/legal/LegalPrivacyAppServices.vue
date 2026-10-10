<!-- Dienste, die die Shiftplan-App (iOS und Android) anspricht. Teil des Abschnitts "dienste". -->
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
  <h4>Shiftplan-App</h4>
  <p>
    Die Shiftplan-App für iOS und Android stellt ES Software bereit (Eric Schubert, Dresden,
    <a href="https://es-software.eu" target="_blank" rel="noopener noreferrer">es-software.eu</a>,
    <a href="mailto:support@es-software.eu">support@es-software.eu</a>). Für die Verarbeitung in
    der App selbst (lokale Speicherung, Anmeldung bei den Push-Diensten, QR-Code-Scan,
    Update-Hinweis) ist ES Software verantwortlich, auch wenn jemand anderes diese Instanz
    betreibt.
  </p>

  <h4>Benachrichtigungen in der Shiftplan-App</h4>
  <p>
    Benachrichtigungen sind in der App zunächst aus. Nach dem Einrichten eines Teams fragt die
    App, ob du alle, nur deine oder vorerst keine Benachrichtigungen möchtest; auf iPhones und ab
    Android 13 fragt danach zusätzlich das System. Erst wenn du zustimmst, meldet sich die App bei
    Firebase Cloud Messaging an (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4,
    Irland), auf iPhones zusätzlich beim Apple Push Notification Service (Apple Inc., One Apple
    Park Way, Cupertino, CA 95014, USA), erhält ein Gerätetoken und meldet es an diese Instanz.
    Google bzw. Apple erhalten dabei eine auf dem Gerät abgelegte Kennung der App-Installation,
    App- und Geräteinformationen und die IP-Adresse, aber keine Daten aus Shiftplan. Schaltest du
    Benachrichtigungen bei allen Teams aus, löscht die App das Gerätetoken.
  </p>
  <p>
    App-Versionen vor 1.3.0 melden sich bei jedem Start bei Firebase und Apple an, auch ohne
    eingerichtetes Team und bei ausgeschalteten Benachrichtigungen, und stellen Benachrichtigungen
    nach dem Einrichten auf „Alle“. Ein Update auf die aktuelle Version beendet das.
  </p>
  <p v-if="ownRelay">
    Pushes an die App schickt diese Instanz über den Push-Dienst push.shiftplan.info von ES
    Software, der über das Netzwerk von Cloudflare (Cloudflare, Inc., 101 Townsend St., San
    Francisco, CA 94107, USA) erreichbar ist, an Firebase Cloud Messaging und auf iPhones weiter
    an Apple.
  </p>
  <p v-else-if="appPush">
    Pushes an die App schickt diese Instanz über den vom Betreiber eingerichteten
    {{ relayHost ? `Push-Dienst ${relayHost}` : "Push-Dienst" }} an Firebase Cloud Messaging
    (Google) und auf iPhones weiter an Apple.
  </p>
  <p v-else>Diese Instanz verschickt keine Pushes an die Shiftplan-App.</p>
  <p v-if="appPush">
    Diese Nachrichten sind auf dem Transport verschlüsselt, aber nicht Ende-zu-Ende:
    {{ ownRelay ? "ES Software, Cloudflare" : "Der Betreiber des Push-Dienstes" }}, Google und
    Apple können den Text technisch lesen. Automatische Hinweise auf Planänderungen enthalten
    deshalb nur Kalenderwoche und Schicht, keine Namen. Namen stehen nur in Nachrichten, die
    jemand bewusst auslöst: Ausfallmeldungen (Name, Tag oder Zeitraum, Schicht, optional ein
    Zusatztext, nie der erfasste Grund), Übernahme- und Tauschanfragen (Name, Schicht oder
    Zeitraum, optional eine Nachricht), deren Zu- oder Absage sowie Nachrichten der Planung.
    Gesundheitsangaben gehören deshalb nicht in diese Freitexte.
    <template v-if="ownRelay">Der Push-Dienst speichert weder Inhalte noch Gerätetokens.</template>
  </p>
  <p>
    Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du
    kannst sie jederzeit widerrufen: Wählst du in der App je Team unter „Benachrichtigungen“
    „Aus“, löscht die Instanz das Gerätetoken und schickt diesem Gerät nichts mehr. Ist die
    Instanz in diesem Moment nicht erreichbar, holt die App die Abmeldung nach. In den
    Systemeinstellungen lassen sich Mitteilungen der App zusätzlich ganz abschalten. Für
    App-Versionen vor 1.3.0 ist Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO; das berechtigte
    Interesse liegt darin, Teams ohne weiteres Zutun über Planänderungen, Ausfälle und Anfragen
    zu informieren. Dort meldet die App das Ausschalten nur, wenn sie die Instanz in diesem
    Moment erreicht.
  </p>
  <p>
    Google kann die Daten in den USA verarbeiten. Die Google LLC
    {{ ownRelay ? "und Cloudflare, Inc. sind" : "ist" }} unter dem EU-US Data Privacy Framework
    zertifiziert; soweit Daten in die USA übermittelt werden, erfolgt dies auf Grundlage des
    Angemessenheitsbeschlusses der EU-Kommission (Art. 45 DSGVO). Auch Apple kann die Daten in den
    USA verarbeiten und stützt diese Übermittlung auf Standardvertragsklauseln der EU-Kommission
    (Art. 46 Abs. 2 lit. c DSGVO).
  </p>
</template>
