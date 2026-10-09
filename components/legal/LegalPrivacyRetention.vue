<template>
  <LegalPrivacySection id="speicherdauer">
    <p>
      Schicht-, Anfrage- und Benutzerdaten werden gespeichert, solange sie für Planung und
      Administration erforderlich sind. Kontaktanfragen werden so lange gespeichert, wie sie zur
      Bearbeitung und zur nachvollziehbaren Dokumentation der Anfrage benötigt werden.
    </p>
    <dl class="privacy-terms">
      <dt>Anmeldung der Planung</dt>
      <dd>
        endet im Browser spätestens 30 Minuten nach der Anmeldung, in der App nach 14 Tagen ohne
        Nutzung. Abmelden beendet sie sofort.
      </dd>
      <dt>Login-Sperren und Rate-Limits</dt>
      <dd>werden nur temporär geführt.</dd>
      <dt>Server-Protokolle</dt>
      <dd>werden bei Instanzen unter shiftplan.info spätestens nach 15 Tagen gelöscht.</dd>
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
        als ungültig meldet.
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
        Ihre persönlichen Zugänge, ihre PIN, offene QR-Codes und die Push-Registrierungen ihrer
        Geräte und Browser werden sofort gelöscht. Beim Entfernen werden außerdem ihre Schichten,
        Rotationseinträge, Ausfälle, tagesgenauen Änderungen und Anfragen gelöscht.
      </dd>
      <dt>Gründe und Notizen von Ausfällen</dt>
      <dd>werden 90 Tage nach dem Ausfalltag gelöscht.</dd>
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
        die Push-Registrierung und entfernt den zwischengespeicherten Plan sofort.
      </li>
      <li>
        Name, Schichten, eingetragene Ausfälle und Anfragen gehören zum Schichtplan deines Teams.
        Löschen kann sie die Planung deiner Firma in Shiftplan (Mitarbeiter bzw. Ausfälle
        entfernen). Mit dir als Mitarbeiter verschwinden auch deine Zugänge, deine PIN und die
        Push-Registrierungen deiner Geräte.
      </li>
      <li>
        Für Instanzen unter shiftplan.info kannst du die Löschung auch direkt bei uns anfordern:
        <a href="mailto:support@es-software.eu">support@es-software.eu</a>. Wir löschen
        innerhalb von 30 Tagen. Selbst betriebene Instanzen verwaltet der jeweilige Betreiber.
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
