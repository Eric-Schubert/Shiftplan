<script setup lang="ts">
defineProps<{
  usesMicrosoft: boolean;
}>();
</script>

<template>
  <LegalPrivacySection id="kontakt">
    <p>
      Wenn das Kontaktformular genutzt wird, speichern wir Name, Rückkontakt, Betreff und
      Nachricht, um die Anfrage bearbeiten zu können. Zusätzlich speichert die Anwendung einen
      aus IP-Adresse und User-Agent gebildeten Hash sowie den User-Agent, um Missbrauch zu
      begrenzen und Kontaktanfragen nachvollziehbar zu halten.
    </p>
    <p v-if="usesMicrosoft">
      Über neue Anfragen benachrichtigen wir per E-Mail über Microsoft 365 (Microsoft Graph).
      Dabei werden Name, Rückkontakt, Betreff und Nachricht an Microsoft übermittelt. Ist der
      Rückkontakt eine gültige E-Mail-Adresse, nutzen wir sie als Antwortadresse.
    </p>
    <p>
      Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, wenn die Anfrage auf einen Vertrag oder
      vorvertragliche Maßnahmen gerichtet ist, ansonsten Art. 6 Abs. 1 lit. f DSGVO. Unser
      berechtigtes Interesse liegt in der Bearbeitung eingehender Anfragen und dem sicheren
      Betrieb des Kontaktformulars.
    </p>
  </LegalPrivacySection>

  <LegalPrivacySection id="cookies">
    <p>
      Für geschützte Bereiche setzt die Anwendung technisch notwendige Cookies. Das Cookie
      <code>session_token</code> hält die Anmeldung der Planung für bis zu 30 Minuten aktiv und
      ist für JavaScript nicht lesbar. Das Cookie <code>csrf_token</code> schützt Formulare und
      API-Aufrufe vor missbräuchlicher Nutzung und gilt ebenso lange. Diese Cookies sind für die
      Anmeldung unbedingt erforderlich und benötigen daher keine Einwilligung (§ 25 Abs. 2 Nr. 2
      TDDDG).
    </p>
    <p>
      Ist der Schichtplan durch einen Team-Zugangscode geschützt, setzt die Anwendung nach
      Eingabe des Codes das Cookie <code>viewer_token</code>. Es erlaubt nur das Lesen des
      Plans, ist für JavaScript nicht lesbar und gilt bis zu 180 Tage. Auch dieses Cookie ist
      technisch erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).
    </p>
    <p>
      Meldet sich jemand im Browser persönlich an (Kürzel und PIN oder Einladungslink), setzt
      die Anwendung das Cookie <code>member_token</code>. Es ist für JavaScript nicht lesbar,
      gilt bis zu 365 Tage und wird beim Abmelden gelöscht. Auch dieses Cookie ist technisch
      erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).
    </p>
    <p>
      Fehlgeschlagene Anmeldeversuche werden zur Angriffserkennung begrenzt. Dafür kann die
      IP-Adresse temporär in einer Rate-Limit-Tabelle verarbeitet werden. Rechtsgrundlage ist
      Art. 6 Abs. 1 lit. f DSGVO; unser Interesse liegt in Zugriffsschutz, Missbrauchsabwehr
      und Stabilität der Anwendung.
    </p>
    <p>
      Beim Aufruf verarbeitet der Server technisch notwendige Verbindungsdaten (IP-Adresse,
      Zeitpunkt, aufgerufene Adresse, Browser-Kennung), um die Seite auszuliefern. Bei
      Instanzen unter shiftplan.info speichert der vorgeschaltete Webserver (Reverse Proxy) diese
      Daten zusammen mit dem Statuscode in Zugriffsprotokollen, um Fehler zu finden und Angriffe
      abzuwehren, und löscht sie spätestens nach 15 Tagen. Rechtsgrundlage ist Art. 6 Abs. 1
      lit. f DSGVO.
    </p>
  </LegalPrivacySection>

  <LegalPrivacySection id="lokal">
    <p>
      Im Browser werden zwei Komforteinstellungen lokal gespeichert: der gewählte Hell- oder
      Dunkelmodus und ob der Hinweis zu Benachrichtigungen ausgeblendet wurde. Diese Werte bleiben auf
      dem Gerät und werden nicht für Werbung oder externes Tracking genutzt.
    </p>
    <p>
      Die Shiftplan-App speichert auf dem Gerät die Adresse des Teams, den gewählten Namen, die
      Benachrichtigungswahl, einen ausgeblendeten Update-Hinweis, nach einer Planer-Anmeldung
      Benutzername und Rolle und, bis die Abmeldung bei der Instanz geklappt hat, das Gerätetoken
      eines Teams, bei dem Benachrichtigungen ausgeschaltet wurden. Die Zugangsschlüssel liegen im
      Schlüsselbund (iOS) bzw. im Android Keystore. Damit der Plan auch ohne Netz lesbar bleibt,
      behält die App außerdem die zuletzt geladenen Wochenpläne mit den Namen des Teams; Wochen,
      die mehr als zwei Wochen zurückliegen, entfernt sie beim nächsten Laden. Passwörter, PINs und
      Ausfallgründe speichert die App nicht. Wie sich diese Daten entfernen lassen, steht unter
      <a href="#app-daten-loeschen">App-Daten löschen</a>. Für die Verarbeitung in der App ist ES
      Software als Anbieter der App verantwortlich (siehe <a href="#dienste">Externe Dienste</a>).
    </p>
    <p>
      Diese Speicherung ist für die gewünschten Einstellungen und für die App erforderlich (§ 25
      Abs. 2 Nr. 2 TDDDG).
    </p>
  </LegalPrivacySection>

  <LegalPrivacySection id="statistik">
    <p>
      Die Anwendung erfasst Seitenaufrufe, um Nutzung und technische Stabilität auszuwerten.
      Gespeichert werden Datum, Seitenpfad, User-Agent, Referrer-Domain, optional grobe
      Standortdaten aus Infrastruktur-Headern sowie ein täglich wechselnder HMAC-Hash aus
      IP-Adresse und User-Agent. Die IP-Adresse wird in der Statistikdatenbank nicht im
      Klartext gespeichert.
    </p>
    <p>
      Die Statistik wird nicht für Werbung eingesetzt. Sie wird automatisch auf maximal 90 Tage
      begrenzt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse
      liegt im sicheren, nachvollziehbaren und bedarfsgerechten Betrieb der Anwendung.
    </p>
    <p>
      Wenn im Browser Do Not Track aktiviert ist, wird kein Besuchsaufruf an die
      Statistikroute gesendet.
    </p>
  </LegalPrivacySection>
</template>
