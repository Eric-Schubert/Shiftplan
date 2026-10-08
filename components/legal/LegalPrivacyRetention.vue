<template>
  <LegalPrivacySection id="speicherdauer">
    <p>
      Schicht-, Benutzer- und Auditdaten werden gespeichert, solange sie für Planung,
      Nachvollziehbarkeit und Administration erforderlich sind. Kontaktanfragen werden so lange
      gespeichert, wie sie zur Bearbeitung und zur nachvollziehbaren Dokumentation der Anfrage
      benötigt werden.
    </p>
    <dl class="privacy-terms">
      <dt>Sitzungen</dt>
      <dd>laufen nach 30 Minuten Inaktivität ab.</dd>
      <dt>Login-Sperren und Rate-Limits</dt>
      <dd>werden nur temporär geführt.</dd>
      <dt>Besuchsstatistik</dt>
      <dd>wird spätestens nach 90 Tagen bereinigt.</dd>
      <dt>Team-Zugangscode</dt>
      <dd>Zugänge laufen spätestens nach 180 Tagen ohne Nutzung ab.</dd>
      <dt>Push-Abonnements und App-Gerätetokens</dt>
      <dd>
        werden gelöscht, sobald Benachrichtigungen ausgeschaltet werden, der Zugangscode
        geändert wird oder der Push-Dienst sie als ungültig meldet.
      </dd>
      <dt>Persönliche App-Zugänge</dt>
      <dd>
        gelten, bis sich das Gerät abmeldet oder die Planung es sperrt. Ein nicht eingelöster
        QR-Code verfällt nach 7 Tagen.
      </dd>
      <dt>Gründe von Ausfällen</dt>
      <dd>werden nach 90 Tagen gelöscht.</dd>
    </dl>
  </LegalPrivacySection>

  <LegalPrivacySection id="app-daten-loeschen">
    <p>So entfernst du die Daten, die die Shiftplan-App (iOS und Android) speichert:</p>
    <ol>
      <li>
        In der App Menü → Einstellungen → „Von diesem Gerät entfernen“ tippen. Das meldet das
        Gerät ab und löscht den App-Zugang, das Gerätetoken für Benachrichtigungen und den
        zwischengespeicherten Plan sofort.
      </li>
      <li>
        Name, Schichten und eingetragene Ausfälle gehören zum Schichtplan deines Teams. Löschen
        kann sie die Planung deiner Firma in Shiftplan (Mitarbeiter bzw. Ausfälle entfernen).
      </li>
      <li>
        Für Instanzen unter shiftplan.info kannst du die Löschung auch direkt bei uns anfordern:
        <a href="mailto:support@es-software.eu">support@es-software.eu</a>. Wir löschen
        innerhalb von 30 Tagen. Selbst betriebene Instanzen verwaltet der jeweilige Betreiber.
      </li>
    </ol>
    <p>
      Gründe von Ausfällen werden unabhängig davon nach 90 Tagen automatisch gelöscht.
      Einträge im Änderungsprotokoll bewahrt die Planung auf, solange sie für die
      Nachvollziehbarkeit des Plans nötig sind.
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
