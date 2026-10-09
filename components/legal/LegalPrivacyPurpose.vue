<template>
  <LegalPrivacySection id="zweck">
    <p>
      Shiftplan dient dazu, Wochenplanung, Schichten, Mitarbeitende, Rotationen und
      administrative Einstellungen zu verwalten. Dabei werden nur Daten verarbeitet, die für
      Betrieb, Planung, Sicherheit und Kontaktaufnahme erforderlich sind.
    </p>
    <p>
      Soweit die Anwendung im Beschäftigungskontext eingesetzt wird, verarbeitet der jeweilige
      Arbeitgeber die Planungsdaten zur Durchführung des Beschäftigungsverhältnisses auf
      Grundlage von Art. 6 Abs. 1 lit. b und c DSGVO.
    </p>
    <p>
      Mitarbeitende können über die Shiftplan-App oder nach persönlicher Anmeldung im Browser
      einen Ausfall für einzelne Tage oder einen Zeitraum melden. Gespeichert werden Tage,
      Schicht und eine Kategorie (Urlaub, Privat oder Sonstiges). Gesundheitsangaben werden
      nicht abgefragt. Den Grund sehen nur Planer; wer den Plan sehen kann, erfährt nur, dass
      jemand ausfällt. Grund und Notiz werden 90 Tage nach dem Ausfalltag automatisch gelöscht.
    </p>
  </LegalPrivacySection>

  <LegalPrivacySection id="daten">
    <p>Je nach Nutzung verarbeitet die Anwendung insbesondere folgende Daten:</p>
    <ul>
      <li>
        Namen, Kürzel und Teilzeit-Kennzeichen von Mitarbeitenden, Schichten, Rotationsmuster,
        Schichtzuweisungen sowie tagesgenaue Änderungen mit Angabe, wer sie eingetragen hat.
      </li>
      <li>Benutzerkonten, Rollen, Anmeldezeitpunkte, Sitzungsdaten und CSRF-Sicherheitsdaten.</li>
      <li>
        Änderungsprotokoll: wer wann Zuweisungen, tagesgenaue Änderungen oder Ausfälle
        eingetragen hat, mit den Namen der Beteiligten, auch bei Aktionen von Mitarbeitenden.
      </li>
      <li>Kontaktangaben und Nachrichten aus dem Kontaktformular.</li>
      <li>
        Push-Abonnements (Zustelladresse beim Push-Dienst des Browsers, Schlüssel und bei
        persönlicher Anmeldung die Zuordnung zur Person), sofern Benachrichtigungen aktiviert
        werden.
      </li>
      <li>
        Persönlicher Zugang in der App oder im Browser: zugeordnete Person, Kürzel, PIN (nur als
        Hash), Gerätename (im Browser aus Browser und Betriebssystem abgeleitet, z. B. „Firefox
        auf macOS“) und Zeitpunkt der letzten Nutzung; in der App zusätzlich Gerätetoken für Push
        und Plattform (iOS/Android).
      </li>
      <li>
        Ausfälle: Tag, Schicht, Kategorie des Grundes, optionale Notiz der Planung, wer den
        Ausfall eingetragen hat und ob über Web oder App.
      </li>
      <li>
        Übernahme- und Tauschanfragen: beteiligte Personen, Schicht und Zeitraum, optionale
        Nachricht (auch der Zusatztext einer Ausfallmeldung, wenn dabei Ersatz gesucht wird),
        Status sowie wer wann entschieden hat.
      </li>
      <li>
        Technische Daten wie User-Agent, Referrer-Domain und grobe Standortdaten, sofern diese
        durch die Infrastruktur übermittelt werden.
      </li>
    </ul>
    <p>
      <strong>Wer was sieht:</strong> Namen, Kürzel, Teilzeit-Kennzeichen, Schichten, Rotation,
      tagesgenaue Änderungen und Ausfälle (ohne Grund und Notiz), jeweils mit Angabe, wer sie
      eingetragen hat, sieht jeder mit Zugang zum Plan. Ist ein Team-Zugangscode gesetzt, sind
      das nur Personen mit Code, persönlichem Zugang oder Planer-Anmeldung. Ohne Code kann jeder,
      der die Adresse kennt, den Plan lesen. Offene Übernahmeanfragen mit ihrer Nachricht sehen
      alle persönlich angemeldeten Mitarbeitenden, Tauschanfragen nur die Beteiligten und die
      Planung. Grund und Notiz eines Ausfalls und die persönlichen Zugänge sehen nur Planer, das
      Änderungsprotokoll und Kontaktanfragen nur Administratoren.
    </p>
  </LegalPrivacySection>
</template>
