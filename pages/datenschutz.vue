<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();

const imprint = computed(() => runtimeConfig.public.imprint || {});
const lastUpdated = "Mai 2026";

const controllerLines = computed(() => {
  const postalCity = [imprint.value.postalCode, imprint.value.city].filter(Boolean).join(" ");
  return [
    imprint.value.providerName,
    imprint.value.streetAddress,
    postalCity,
    imprint.value.country,
  ].filter(Boolean);
});

const hasController = computed(() => controllerLines.value.length > 0);

useSeoMeta({
  title: "Datenschutz | Schichtplaner",
  description:
    "Datenschutzerklärung für den Schichtplaner mit Informationen zu Kontaktformular, Microsoft Graph, Statistik und gespeicherten Planungsdaten.",
});
</script>

<template>
  <div class="planner-shell">
    <section class="planner-slab">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-3">
          <p class="planner-kicker">Datenschutz</p>
          <div>
            <h2 class="text-2xl font-semibold text-[var(--text-1)] sm:text-3xl">
              Datenschutzerklärung
            </h2>
            <p class="mt-2 max-w-[56rem] text-sm leading-6 text-[var(--text-2)]">
              Diese Hinweise erklären, welche personenbezogenen Daten im Schichtplaner verarbeitet
              werden, wofür sie genutzt werden und welche Rechte betroffene Personen haben.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <NuxtLink to="/impressum">
            <PrimeButton
              label="Zum Impressum"
              icon="pi pi-id-card"
              severity="secondary"
              outlined
              class="min-h-11 !rounded-full"
            />
          </NuxtLink>
          <NuxtLink to="/">
            <PrimeButton
              label="Zum Schichtplan"
              icon="pi pi-arrow-left"
              severity="secondary"
              outlined
              class="min-h-11 !rounded-full"
            />
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="planner-panel">
      <div class="grid gap-3 md:grid-cols-3">
        <article class="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
          <p class="planner-kicker">Kurz gesagt</p>
          <h3 class="mt-2 text-base font-semibold text-[var(--text-1)]">Keine Werbung</h3>
          <p class="mt-2 text-sm leading-6 text-[var(--text-2)]">
            Es gibt keine Marketing-Cookies und keine Weitergabe zu Werbezwecken.
          </p>
        </article>

        <article class="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
          <p class="planner-kicker">Kontakt</p>
          <h3 class="mt-2 text-base font-semibold text-[var(--text-1)]">Microsoft 365</h3>
          <p class="mt-2 text-sm leading-6 text-[var(--text-2)]">
            Kontaktanfragen können über Microsoft Graph an ein Exchange-Online-Postfach zugestellt
            werden.
          </p>
        </article>

        <article class="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
          <p class="planner-kicker">Statistik</p>
          <h3 class="mt-2 text-base font-semibold text-[var(--text-1)]">Sparsam erfasst</h3>
          <p class="mt-2 text-sm leading-6 text-[var(--text-2)]">
            Seitenaufrufe werden ohne Klartext-IP gespeichert und nach spätestens 90 Tagen
            bereinigt.
          </p>
        </article>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
      <aside class="planner-panel h-fit lg:sticky lg:top-24">
        <p class="planner-kicker">Verantwortlich</p>

        <address v-if="hasController" class="mt-4 not-italic text-sm leading-7 text-[var(--text-1)]">
          <span v-for="line in controllerLines" :key="line" class="block">
            {{ line }}
          </span>
        </address>

        <p v-else class="mt-4 text-sm leading-6 text-[var(--text-2)]">
          Die Anbieterangaben werden über die Impressums-Konfiguration der Anwendung gepflegt.
        </p>

        <div class="mt-5 space-y-3 text-sm leading-6 text-[var(--text-2)]">
          <p>
            Datenschutzanfragen können über das Kontaktformular im Impressum gestellt werden.
          </p>
          <p class="text-[var(--text-3)]">Stand: {{ lastUpdated }}</p>
        </div>
      </aside>

      <div class="space-y-4">
        <section class="planner-panel">
          <p class="planner-kicker">1. Zweck der Anwendung</p>
          <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">
            <p>
              Der Schichtplaner dient dazu, Wochenplanung, Schichten, Mitarbeitende, Rotationen und
              administrative Einstellungen zu verwalten. Dabei werden nur Daten verarbeitet, die für
              Betrieb, Planung, Sicherheit und Kontaktaufnahme erforderlich sind.
            </p>
            <p>
              Soweit die Anwendung im Beschäftigungskontext eingesetzt wird, kann zusätzlich zu den
              nachfolgend genannten Rechtsgrundlagen auch § 26 BDSG einschlägig sein.
            </p>
          </div>
        </section>

        <section class="planner-panel">
          <p class="planner-kicker">2. Verarbeitete Daten</p>
          <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">
            <p>Je nach Nutzung verarbeitet die Anwendung insbesondere folgende Daten:</p>
            <ul class="list-disc space-y-2 pl-5">
              <li>Namen von Mitarbeitenden, Schichten, Rotationsmuster und Schichtzuweisungen.</li>
              <li>Benutzerkonten, Rollen, Anmeldezeitpunkte, Sitzungsdaten und CSRF-Sicherheitsdaten.</li>
              <li>Audit-Protokolle zu Zuweisungen und Änderungen im Schichtplan.</li>
              <li>Kontaktangaben und Nachrichten aus dem Kontaktformular.</li>
              <li>Technische Daten wie User-Agent, Referrer-Domain und grobe Standortdaten, sofern diese durch die Infrastruktur übermittelt werden.</li>
            </ul>
          </div>
        </section>

        <section class="planner-panel">
          <p class="planner-kicker">3. Kontaktformular und E-Mail-Zustellung</p>
          <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">
            <p>
              Wenn das Kontaktformular genutzt wird, speichern wir Name, Rückkontakt, Betreff und
              Nachricht, um die Anfrage bearbeiten zu können. Zusätzlich speichert die Anwendung
              einen aus IP-Adresse und User-Agent gebildeten Hash sowie den User-Agent, um Missbrauch
              zu begrenzen und Kontaktanfragen nachvollziehbar zu halten.
            </p>
            <p>
              Die Benachrichtigung kann über Microsoft Graph an ein Microsoft-365- beziehungsweise
              Exchange-Online-Postfach zugestellt werden. Dabei werden die Inhalte der Kontaktanfrage
              an Microsoft übermittelt. Der Versand erfolgt über das konfigurierte Postfach; die von
              der anfragenden Person angegebene E-Mail-Adresse wird nur als Rückkontakt und, wenn sie
              eine gültige E-Mail-Adresse ist, als Antwortadresse der Nachricht verwendet.
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, wenn die Anfrage auf einen Vertrag
              oder vorvertragliche Maßnahmen gerichtet ist, ansonsten Art. 6 Abs. 1 lit. f DSGVO.
              Unser berechtigtes Interesse liegt in der Bearbeitung eingehender Anfragen und dem
              sicheren Betrieb des Kontaktformulars.
            </p>
          </div>
        </section>

        <section class="planner-panel">
          <p class="planner-kicker">4. Anmeldung, Sicherheit und Cookies</p>
          <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">
            <p>
              Für geschützte Bereiche setzt die Anwendung technisch notwendige Cookies. Das Cookie
              <span class="font-semibold text-[var(--text-1)]">session_token</span> hält die
              Anmeldung für bis zu 30 Minuten aktiv und ist für JavaScript nicht lesbar. Das Cookie
              <span class="font-semibold text-[var(--text-1)]">csrf_token</span> schützt Formulare
              und API-Aufrufe vor missbräuchlicher Nutzung.
            </p>
            <p>
              Fehlgeschlagene Anmeldeversuche werden zur Angriffserkennung begrenzt. Dafür kann die
              IP-Adresse temporär in einer Rate-Limit-Tabelle verarbeitet werden. Rechtsgrundlage ist
              Art. 6 Abs. 1 lit. f DSGVO; unser Interesse liegt in Zugriffsschutz, Missbrauchsabwehr
              und Stabilität der Anwendung.
            </p>
          </div>
        </section>

        <section class="planner-panel">
          <p class="planner-kicker">5. Lokale Speicherung im Browser</p>
          <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">
            <p>
              Im Browser werden einzelne Komforteinstellungen lokal gespeichert, zum Beispiel der
              gewählte Hell- oder Dunkelmodus, der zuletzt gelesene Versionshinweis und ob der
              Installationshinweis der Web-App ausgeblendet wurde. Diese Werte bleiben auf dem Gerät
              und werden nicht für Werbung oder externes Tracking genutzt.
            </p>
          </div>
        </section>

        <section class="planner-panel">
          <p class="planner-kicker">6. Besuchsstatistik</p>
          <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">
            <p>
              Die Anwendung erfasst Seitenaufrufe, um Nutzung und technische Stabilität auszuwerten.
              Gespeichert werden Datum, Seitenpfad, User-Agent, Referrer-Domain, optional grobe
              Standortdaten aus Infrastruktur-Headern sowie ein täglich wechselnder HMAC-Hash aus
              IP-Adresse und User-Agent. Die IP-Adresse wird in der Statistikdatenbank nicht im
              Klartext gespeichert.
            </p>
            <p>
              Die Statistik wird nicht für Werbung eingesetzt. Sie wird automatisch auf maximal
              90 Tage begrenzt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes
              Interesse liegt im sicheren, nachvollziehbaren und bedarfsgerechten Betrieb der
              Anwendung.
            </p>
          </div>
        </section>

        <section class="planner-panel">
          <p class="planner-kicker">7. Externe Dienste</p>
          <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">
            <p>
              Für die E-Mail-Zustellung kann Microsoft 365 beziehungsweise Microsoft Graph genutzt
              werden. Microsoft verarbeitet Daten dabei als Dienstleister im Rahmen der Microsoft
              Vertrags- und Datenschutzbedingungen. Soweit Daten außerhalb der EU oder des EWR
              verarbeitet werden, stützt sich Microsoft nach eigenen Angaben auf geeignete Garantien.
            </p>
            <p>
              Feiertage und Schulferien werden serverseitig über die OpenHolidays API abgerufen.
              Dabei werden keine Namen, Kontaktanfragen oder Schichtzuweisungen an OpenHolidays
              übertragen; die Abfrage enthält im Wesentlichen Jahr, Zeitraum und Bundesland.
            </p>
          </div>
        </section>

        <section class="planner-panel">
          <p class="planner-kicker">8. Speicherdauer</p>
          <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">
            <p>
              Schicht-, Benutzer- und Auditdaten werden gespeichert, solange sie für Planung,
              Nachvollziehbarkeit und Administration erforderlich sind. Kontaktanfragen werden so
              lange gespeichert, wie sie zur Bearbeitung und zur nachvollziehbaren Dokumentation der
              Anfrage benötigt werden.
            </p>
            <p>
              Sitzungen laufen nach 30 Minuten Inaktivität ab. Login-Sperren und Rate-Limits werden
              nur temporär geführt. Besuchsstatistiken werden spätestens nach 90 Tagen bereinigt.
            </p>
          </div>
        </section>

        <section class="planner-panel">
          <p class="planner-kicker">9. Rechte betroffener Personen</p>
          <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">
            <p>
              Betroffene Personen haben nach Maßgabe der DSGVO insbesondere das Recht auf Auskunft,
              Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie
              Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen.
            </p>
            <p>
              Außerdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde. Für Sachsen
              ist dies die
              <a
                href="https://www.datenschutz.sachsen.de/"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-[var(--accent-strong)] underline decoration-transparent underline-offset-4 transition hover:decoration-current"
              >
                Sächsische Datenschutz- und Transparenzbeauftragte
              </a>.
            </p>
          </div>
        </section>

        <section class="planner-panel">
          <p class="planner-kicker">10. Änderungen</p>
          <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">
            <p>
              Diese Datenschutzerklärung wird angepasst, wenn sich Datenflüsse, eingesetzte Dienste
              oder rechtliche Anforderungen ändern. Die jeweils aktuelle Fassung ist auf dieser Seite
              abrufbar.
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
