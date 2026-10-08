<template>
  <LegalPrivacySection id="kontakt">
    <p>
      Wenn das Kontaktformular genutzt wird, speichern wir Name, Rückkontakt, Betreff und
      Nachricht, um die Anfrage bearbeiten zu können. Zusätzlich speichert die Anwendung einen
      aus IP-Adresse und User-Agent gebildeten Hash sowie den User-Agent, um Missbrauch zu
      begrenzen und Kontaktanfragen nachvollziehbar zu halten.
    </p>
    <p>
      Die Benachrichtigung kann über Microsoft Graph an ein Microsoft-365- beziehungsweise
      Exchange-Online-Postfach zugestellt werden. Dabei werden die Inhalte der Kontaktanfrage
      an Microsoft übermittelt. Der Versand erfolgt über das konfigurierte Postfach; die von
      der anfragenden Person angegebene E-Mail-Adresse wird nur als Rückkontakt und, wenn sie
      eine gültige E-Mail-Adresse ist, als Antwortadresse der Nachricht verwendet.
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
      <code>session_token</code> hält die Anmeldung für bis zu 30 Minuten aktiv und ist für
      JavaScript nicht lesbar. Das Cookie <code>csrf_token</code> schützt Formulare und
      API-Aufrufe vor missbräuchlicher Nutzung. Diese Cookies sind für die Anmeldung unbedingt
      erforderlich und benötigen daher keine Einwilligung (§ 25 Abs. 2 Nr. 2 TDDDG).
    </p>
    <p>
      Ist der Schichtplan durch einen Team-Zugangscode geschützt, setzt die Anwendung nach
      Eingabe des Codes das Cookie <code>viewer_token</code>. Es erlaubt nur das Lesen des
      Plans, ist für JavaScript nicht lesbar und gilt bis zu 180 Tage. Auch dieses Cookie ist
      technisch erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).
    </p>
    <p>
      Fehlgeschlagene Anmeldeversuche werden zur Angriffserkennung begrenzt. Dafür kann die
      IP-Adresse temporär in einer Rate-Limit-Tabelle verarbeitet werden. Rechtsgrundlage ist
      Art. 6 Abs. 1 lit. f DSGVO; unser Interesse liegt in Zugriffsschutz, Missbrauchsabwehr
      und Stabilität der Anwendung.
    </p>
  </LegalPrivacySection>

  <LegalPrivacySection id="lokal">
    <p>
      Im Browser werden einzelne Komforteinstellungen lokal gespeichert, zum Beispiel der
      gewählte Hell- oder Dunkelmodus, der zuletzt gelesene Versionshinweis und ob der
      Installations- oder Benachrichtigungshinweis ausgeblendet wurde. Diese Werte bleiben auf
      dem Gerät und werden nicht für Werbung oder externes Tracking genutzt. Die Speicherung
      ist für die gewünschten Einstellungen erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).
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
