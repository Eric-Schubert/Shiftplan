<template>
  <LegalPrivacySection id="speicherdauer">
    <p>
      Schicht-, Anfrage- und Benutzerdaten werden gespeichert, solange sie für Planung und
      Administration erforderlich sind. Für einzelne Daten gelten feste Fristen:
    </p>
    <dl class="privacy-terms">
      <dt>Anmeldung der Planung</dt>
      <dd>
        endet im Browser spätestens 30 Minuten nach der Anmeldung, in der App nach 14 Tagen ohne
        Nutzung. Abmelden beendet sie sofort.
      </dd>
      <dt>Login-Sperren und Rate-Limits</dt>
      <dd>werden nur temporär geführt.</dd>
      <dt>Zugriffsprotokolle</dt>
      <dd>werden bei Instanzen unter shiftplan.info spätestens nach 15 Tagen gelöscht.</dd>
      <dt>Kontaktanfragen</dt>
      <dd>werden ein Jahr nach Eingang gelöscht.</dd>
      <dt>Besuchsstatistik</dt>
      <dd>wird spätestens nach 90 Tagen bereinigt.</dd>
      <dt>Team-Zugangscode</dt>
      <dd>
        Zugänge gelten im Browser bis zu 180 Tage ab Eingabe des Codes, in der App bis zu 180
        Tage nach der letzten Nutzung; ein neuer Code beendet alle sofort.
      </dd>
      <dt>Push-Abonnements und App-Gerätetokens</dt>
      <dd>
        werden gelöscht, sobald Benachrichtigungen ausgeschaltet werden, der persönliche Zugang
        des Geräts bzw. Browsers endet, der Zugangscode geändert wird oder der Push-Dienst sie
        als ungültig meldet. Das Ausschalten meldet die App nur, wenn sie die Instanz in diesem
        Moment erreicht; sonst bleibt das Token bis zu einem der anderen Fälle gespeichert.
      </dd>
      <dt>Persönliche Zugänge (App und Browser)</dt>
      <dd>
        gelten, bis sich das Gerät bzw. der Browser abmeldet, die Planung den Zugang sperrt oder
        die Person entfernt oder deaktiviert, und werden dann gelöscht. Im Browser endet die
        Anmeldung spätestens 365 Tage nach dem Anmelden; Zugänge, die 365 Tage nicht genutzt
        wurden, werden gelöscht. Ein nicht eingelöster QR-Code verfällt nach 7 Tagen.
      </dd>
      <dt>Entfernte oder deaktivierte Mitarbeitende</dt>
      <dd>
        Ihre persönlichen Zugänge, ihre PIN, offene QR-Codes und die ihnen zugeordneten
        Push-Registrierungen werden sofort gelöscht, offene Anfragen zurückgezogen. Lesezugänge und
        Push-Registrierungen über den Team-Link ohne Namen sind davon nicht betroffen; sie enden
        wie oben beschrieben, sofort etwa mit einem neuen Team-Zugangscode. Beim Entfernen werden
        außerdem ihre Schichten, Rotationseinträge, Ausfälle, tagesgenauen Änderungen und Anfragen
        gelöscht.
      </dd>
      <dt>Gründe und Notizen von Ausfällen</dt>
      <dd>werden 90 Tage nach dem Ausfalltag gelöscht.</dd>
      <dt>Entfernte Ausfälle</dt>
      <dd>werden 90 Tage nach dem Ausfalltag endgültig gelöscht.</dd>
      <dt>Nachrichten in Anfragen</dt>
      <dd>werden 90 Tage nach dem letzten Tag der Anfrage gelöscht.</dd>
      <dt>Änderungsprotokoll</dt>
      <dd>
        Einträge werden nach 2 Jahren automatisch gelöscht. Bis dahin bleibt der Name darin auch
        dann stehen, wenn die Person aus dem Plan entfernt wurde.
      </dd>
    </dl>
  </LegalPrivacySection>

  <LegalPrivacySection id="app-daten-loeschen">
    <p>So entfernst du die Daten, die die Shiftplan-App (iOS und Android) speichert:</p>
    <ol>
      <li>
        In der App Menü → Einstellungen → „Von diesem Gerät entfernen“ tippen, am besten vor dem
        Deinstallieren. Das meldet das Gerät bei der Instanz ab, löscht dort den App-Zugang und
        die Push-Registrierung und entfernt den zwischengespeicherten Plan sofort. Ohne Verbindung
        zur Instanz entfernt die App nur die Daten auf dem Gerät; Zugang und Push-Registrierung
        enden dann wie unter Speicherdauer beschrieben.
      </li>
      <li>
        Name, Schichten, eingetragene Ausfälle und Anfragen gehören zum Schichtplan deines Teams.
        Löschen kann sie die Planung deiner Firma in Shiftplan, indem sie dich als Mitarbeiter
        entfernt. Damit verschwinden auch die dir zugeordneten Zugänge, deine PIN und die dir
        zugeordneten Push-Registrierungen. Einzelne Ausfälle kann sie entfernen; Shiftplan löscht
        sie dann 90 Tage nach dem Ausfalltag endgültig.
      </li>
      <li>
        Für Instanzen unter shiftplan.info kannst du die Löschung auch bei ES Software anfordern:
        <a href="mailto:support@es-software.eu">support@es-software.eu</a>. ES Software kümmert
        sich innerhalb eines Monats darum und stimmt sich bei Plandaten mit der Planung deines
        Teams ab. Selbst betriebene Instanzen verwaltet der jeweilige Betreiber.
      </li>
    </ol>
    <p>
      Gründe und Notizen von Ausfällen sowie Nachrichten in Anfragen werden unabhängig davon nach
      90 Tagen automatisch gelöscht, Einträge im Änderungsprotokoll nach 2 Jahren.
    </p>
  </LegalPrivacySection>
</template>

<style scoped>
.privacy-terms {
  display: grid;
  grid-template-columns: minmax(0, 15rem) minmax(0, 1fr);
  margin: 0;
  border-top: 1px solid var(--border-soft);
}

.privacy-terms dt,
.privacy-terms dd {
  margin: 0;
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--border-soft);
}

.privacy-terms dt {
  padding-right: 1rem;
  color: var(--text-1);
  font-weight: 600;
}

@media (max-width: 640px) {
  .privacy-terms {
    grid-template-columns: minmax(0, 1fr);
  }

  .privacy-terms dt {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .privacy-terms dd {
    padding-top: 0;
  }
}
</style>
