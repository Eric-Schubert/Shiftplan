<!-- Dienste, die die Shiftplan-App (iOS und Android) anspricht. Teil des Abschnitts "dienste". -->
<script setup lang="ts">
import { DEFAULT_RELAY_HOST } from "~/utils/legal/privacy";

const props = defineProps<{
  /** False when this instance sends nothing to the app (SHIFTPLAN_PUSH_RELAY_URL=off). */
  appPush: boolean;
  relayHost: string | null;
}>();

const ownRelay = computed(() => props.appPush && props.relayHost === DEFAULT_RELAY_HOST);
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
    Bei jedem Start meldet sich die App bei Firebase Cloud Messaging an (Google Ireland Limited,
    Gordon House, Barrow Street, Dublin 4, Irland), auf iPhones zusätzlich beim Apple Push
    Notification Service (Apple Inc., One Apple Park Way, Cupertino, CA 95014, USA), und erhält
    ein Gerätetoken für Benachrichtigungen. Das geschieht derzeit auch, bevor ein Team
    eingerichtet ist, und auch bei ausgeschalteten Benachrichtigungen. Google bzw. Apple erhalten
    dabei eine auf dem Gerät abgelegte Kennung der App-Installation, App- und Geräteinformationen
    und die IP-Adresse, aber keine Daten aus Shiftplan.
  </p>
  <p>
    Nach dem Einrichten eines Teams stehen Benachrichtigungen auf „Alle“, und die App meldet das
    Gerätetoken an diese Instanz. Auf iPhones und ab Android 13 fragt das System dabei einmal, ob
    die App Mitteilungen zeigen darf; auf Android 12 und älter gibt es diese Abfrage nicht.
  </p>
  <p v-if="ownRelay">
    Pushes an die App schickt diese Instanz über den Push-Dienst {{ DEFAULT_RELAY_HOST }} von ES
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
    Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt darin, Teams
    ohne weiteres Zutun über Planänderungen, Ausfälle und Anfragen zu informieren, damit
    Schichten besetzt bleiben. Bei eingeschalteten Benachrichtigungen ist das Gerätetoken für die
    Zustellung unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Widersprechen kannst du
    jederzeit: Wählst du in der App je Team unter „Benachrichtigungen“ „Aus“, löscht die Instanz
    das Gerätetoken und schickt diesem Gerät nichts mehr. In den Systemeinstellungen lassen sich
    Mitteilungen der App zusätzlich ganz abschalten.
  </p>
  <p>
    Google kann die Daten in den USA verarbeiten. Die Google LLC
    {{ ownRelay ? "und Cloudflare, Inc. sind" : "ist" }} unter dem EU-US Data Privacy Framework
    zertifiziert; soweit Daten in die USA übermittelt werden, erfolgt dies auf Grundlage des
    Angemessenheitsbeschlusses der EU-Kommission (Art. 45 DSGVO). Auch Apple kann die Daten in den
    USA verarbeiten und stützt diese Übermittlung auf Standardvertragsklauseln der EU-Kommission
    (Art. 46 Abs. 2 lit. c DSGVO).
  </p>

  <h4>QR-Code-Scan in der App</h4>
  <p>
    Die Kamera nutzt die App nur, wenn jemand „QR-Code scannen“ tippt. Das Bild wird auf dem
    Gerät ausgewertet, nicht gespeichert und nicht übertragen. Auf iPhones erkennt Apple Vision
    den Code vollständig auf dem Gerät. Auf Android übernimmt das Google ML Kit. ML Kit sendet
    dabei technische Nutzungs- und Leistungsdaten an Google: Hersteller und Modell, Android- und
    App-Version, App-Kennung, eine zufällige Kennung der Installation, Bildformat und -auflösung,
    Erkennungsdauer und Fehlercodes. Bilder und Codeinhalte sind nicht dabei. Rechtsgrundlage ist
    Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt in einer einfachen und
    zuverlässigen Einrichtung der App. Google kann diese Daten in den USA verarbeiten; die Google
    LLC ist unter dem EU-US Data Privacy Framework zertifiziert (Art. 45 DSGVO). Ohne Kamera lässt
    sich die App über „Ohne Kamera einrichten“ mit Adresse und Code verbinden.
  </p>

  <h4>Update-Hinweis in der App</h4>
  <p>
    Nach dem Start prüft die Shiftplan-App, ob eine neuere Version verfügbar ist. Auf iPhones
    fragt sie dazu beim App Store von Apple nach und überträgt nur die App-Kennung und das Land,
    auf Android läuft die Prüfung über die Google-Play-App auf dem Gerät. Apple bzw. Google
    erhalten dabei technisch bedingt die IP-Adresse des Geräts. Daten aus Shiftplan wie Namen
    oder Schichten werden nicht übertragen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das
    berechtigte Interesse liegt darin, auf Updates mit Fehlerbehebungen hinzuweisen. Apple Inc.
    und Google LLC können dabei Daten in den USA verarbeiten; Grundlage sind
    Standardvertragsklauseln (Apple, Art. 46 Abs. 2 lit. c DSGVO) bzw. das EU-US Data Privacy
    Framework (Google, Art. 45 DSGVO).
  </p>
</template>
