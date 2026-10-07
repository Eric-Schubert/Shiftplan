<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();

const imprint = computed(() => runtimeConfig.public.imprint || {});
const lastUpdated = "Oktober 2026";
const { demoLogin, privacy } = runtimeConfig.public;
const isDemo = Boolean(demoLogin?.username && demoLogin?.password);
const usesCloudflare = Boolean(privacy?.cloudflare);

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

// Reihenfolge = Nummerierung im Text und im Inhaltsverzeichnis. Die ID
// "app-daten-loeschen" verlinken die Store-Einträge, sie muss bleiben.
const sections = [
  { id: "zweck", title: "Zweck der Anwendung" },
  { id: "daten", title: "Verarbeitete Daten" },
  { id: "kontakt", title: "Kontaktformular und E-Mail" },
  { id: "cookies", title: "Anmeldung, Sicherheit und Cookies" },
  { id: "lokal", title: "Lokale Speicherung im Browser" },
  { id: "statistik", title: "Besuchsstatistik" },
  { id: "dienste", title: "Externe Dienste" },
  { id: "speicherdauer", title: "Speicherdauer" },
  { id: "app-daten-loeschen", title: "App-Daten löschen" },
  { id: "rechte", title: "Rechte betroffener Personen" },
  { id: "aenderungen", title: "Änderungen" },
] as const;

type SectionId = (typeof sections)[number]["id"];
const sectionNumber = (id: SectionId) => sections.findIndex((section) => section.id === id) + 1;
const sectionTitle = (id: SectionId) => sections.find((section) => section.id === id)!.title;

const linkClass =
  "font-medium text-[var(--accent-strong)] underline underline-offset-4 decoration-[color-mix(in_srgb,currentColor_35%,transparent)] transition hover:decoration-current";

useSeoMeta({
  title: "Datenschutz | Shiftplan",
  description:
    "Datenschutzerklärung für Shiftplan: welche Daten Planung, Team-App, Kontaktformular und Statistik verarbeiten, wie lange sie gespeichert werden und welche Rechte du hast.",
});
</script>

<template>
  <div class="privacy mx-auto max-w-[72rem] pb-16 pt-2 sm:pt-6">
    <header class="max-w-[44rem]">
      <h2 class="text-[clamp(2rem,1.5rem+2vw,2.875rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-1)]">
        Datenschutzerklärung
      </h2>
      <p class="mt-4 text-[1.0625rem] leading-7 text-[var(--text-2)]">
        Welche personenbezogenen Daten Shiftplan verarbeitet, wofür sie genutzt werden, wie lange
        sie bleiben und welche Rechte du hast.
      </p>
      <p class="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--text-3)]">
        <span>Stand: {{ lastUpdated }}</span>
        <NuxtLink to="/impressum" :class="linkClass">Impressum</NuxtLink>
        <NuxtLink to="/" :class="linkClass">Zum Schichtplan</NuxtLink>
      </p>
    </header>

    <aside
      v-if="isDemo"
      class="mt-8 max-w-[44rem] border-l-4 border-[var(--brand-red)] bg-[var(--surface)] py-3 pl-4 pr-4 text-[0.9375rem] leading-7 text-[var(--text-1)]"
    >
      <strong>Das ist eine öffentliche Demo.</strong>
      Alle eingegebenen Daten sind für andere Besucherinnen und Besucher sichtbar und werden
      regelmäßig automatisch gelöscht. Bitte gib hier keine echten personenbezogenen Daten ein.
    </aside>

    <section
      aria-labelledby="kurz"
      class="mt-10 max-w-[44rem] rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6"
    >
      <h3 id="kurz" class="text-lg font-semibold text-[var(--text-1)]">Das Wichtigste in Kürze</h3>
      <ul class="mt-4 divide-y divide-[var(--border-soft)] text-[0.9375rem] leading-6">
        <li class="py-3 first:pt-0">
          <strong class="text-[var(--text-1)]">Gründe für Ausfälle sieht nur die Planung.</strong>
          <span class="text-[var(--text-2)]"> Das Team erfährt nur, wer fehlt. Gründe werden nach 90 Tagen gelöscht.</span>
        </li>
        <li class="py-3">
          <strong class="text-[var(--text-1)]">Kein Konto für Mitarbeitende.</strong>
          <span class="text-[var(--text-2)]"> Der App-Zugang läuft über einen persönlichen QR-Code, ohne E-Mail-Adresse oder Telefonnummer.</span>
        </li>
        <li class="py-3">
          <strong class="text-[var(--text-1)]">App-Hinweise auf Planänderungen nennen keine Namen.</strong>
          <span class="text-[var(--text-2)]"> Sie laufen unverschlüsselt über Google und Apple und enthalten deshalb nur Woche und Schicht.</span>
        </li>
        <li class="py-3">
          <strong class="text-[var(--text-1)]">Keine Werbung, keine Analyse-Dienste von Dritten.</strong>
          <span class="text-[var(--text-2)]"> Die eigene Besuchsstatistik speichert keine IP-Adressen im Klartext und wird nach 90 Tagen bereinigt.</span>
        </li>
        <li class="py-3 last:pb-0">
          <strong class="text-[var(--text-1)]">Cookies nur für Anmeldung und Zugang.</strong>
          <span class="text-[var(--text-2)]"> Sie sind technisch nötig, deshalb gibt es kein Cookie-Banner.</span>
        </li>
      </ul>
    </section>

    <div class="mt-12 grid gap-10 lg:grid-cols-[15rem_minmax(0,44rem)] lg:gap-16">
      <aside class="lg:sticky lg:top-24 lg:h-fit">
        <h3 class="text-sm font-semibold text-[var(--text-1)]">Verantwortlich</h3>
        <address
          v-if="hasController"
          class="mt-2 not-italic text-[0.9375rem] leading-6 text-[var(--text-2)]"
        >
          <span v-for="line in controllerLines" :key="line" class="block">{{ line }}</span>
        </address>
        <p v-else class="mt-2 text-[0.9375rem] leading-6 text-[var(--text-2)]">
          Die Anbieterangaben werden über die Impressums-Konfiguration der Anwendung gepflegt.
        </p>
        <p v-if="imprint.publicEmail" class="mt-2 text-[0.9375rem] leading-6">
          <a :href="`mailto:${imprint.publicEmail}`" :class="linkClass">{{ imprint.publicEmail }}</a>
        </p>
        <p class="mt-2 text-sm leading-6 text-[var(--text-3)]">
          Datenschutzanfragen gehen per E-Mail oder über das Kontaktformular im Impressum.
        </p>

        <nav aria-label="Inhalt" class="mt-8 hidden lg:block">
          <h3 class="text-sm font-semibold text-[var(--text-1)]">Inhalt</h3>
          <ol class="mt-2 space-y-1 text-sm leading-6">
            <li v-for="(section, index) in sections" :key="section.id" class="flex gap-2">
              <span class="w-5 flex-shrink-0 tabular-nums text-[var(--text-3)]">{{ index + 1 }}</span>
              <a :href="`#${section.id}`" class="text-[var(--text-2)] hover:text-[var(--text-1)]">{{ section.title }}</a>
            </li>
          </ol>
        </nav>
      </aside>

      <article class="privacy-body">
        <section id="zweck">
          <h3><span>{{ sectionNumber("zweck") }}</span>{{ sectionTitle("zweck") }}</h3>
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
            Mitarbeitende können über die Shiftplan-App einen Ausfall für einzelne Tage oder einen
            Zeitraum melden. Gespeichert werden Tage, Schicht und eine Kategorie (Urlaub, Privat oder
            Sonstiges). Gesundheitsangaben werden nicht abgefragt. Den Grund sehen nur Planer, das
            Team erfährt nur, dass jemand ausfällt. Grund und Notiz werden 90 Tage nach dem
            Ausfalltag automatisch gelöscht.
          </p>
        </section>

        <section id="daten">
          <h3><span>{{ sectionNumber("daten") }}</span>{{ sectionTitle("daten") }}</h3>
          <p>Je nach Nutzung verarbeitet die Anwendung insbesondere folgende Daten:</p>
          <ul>
            <li>Namen von Mitarbeitenden, Schichten, Rotationsmuster und Schichtzuweisungen.</li>
            <li>Benutzerkonten, Rollen, Anmeldezeitpunkte, Sitzungsdaten und CSRF-Sicherheitsdaten.</li>
            <li>Audit-Protokolle zu Zuweisungen und Änderungen im Schichtplan.</li>
            <li>Kontaktangaben und Nachrichten aus dem Kontaktformular.</li>
            <li>
              Push-Abonnements (Zustelladresse beim Push-Dienst des Browsers und Schlüssel), sofern
              Benachrichtigungen aktiviert werden.
            </li>
            <li>
              Bei Nutzung der Shiftplan-App: persönlicher App-Zugang (Mitarbeiter, Gerätename,
              Zeitpunkt der letzten Nutzung), Gerätetoken für Push und Plattform (iOS/Android).
            </li>
            <li>
              Ausfälle: Tag, Schicht, Kategorie des Grundes, wer den Ausfall eingetragen hat und ob
              über Web oder App.
            </li>
            <li>
              Technische Daten wie User-Agent, Referrer-Domain und grobe Standortdaten, sofern diese
              durch die Infrastruktur übermittelt werden.
            </li>
          </ul>
        </section>

        <section id="kontakt">
          <h3><span>{{ sectionNumber("kontakt") }}</span>{{ sectionTitle("kontakt") }}</h3>
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
        </section>

        <section id="cookies">
          <h3><span>{{ sectionNumber("cookies") }}</span>{{ sectionTitle("cookies") }}</h3>
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
        </section>

        <section id="lokal">
          <h3><span>{{ sectionNumber("lokal") }}</span>{{ sectionTitle("lokal") }}</h3>
          <p>
            Im Browser werden einzelne Komforteinstellungen lokal gespeichert, zum Beispiel der
            gewählte Hell- oder Dunkelmodus, der zuletzt gelesene Versionshinweis und ob der
            Installations- oder Benachrichtigungshinweis ausgeblendet wurde. Diese Werte bleiben auf
            dem Gerät und werden nicht für Werbung oder externes Tracking genutzt. Die Speicherung
            ist für die gewünschten Einstellungen erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).
          </p>
        </section>

        <section id="statistik">
          <h3><span>{{ sectionNumber("statistik") }}</span>{{ sectionTitle("statistik") }}</h3>
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
        </section>

        <section id="dienste">
          <h3><span>{{ sectionNumber("dienste") }}</span>{{ sectionTitle("dienste") }}</h3>

          <template v-if="usesCloudflare">
            <h4>Auslieferung über Cloudflare</h4>
            <p>
              Diese Anwendung wird über das Netzwerk von Cloudflare ausgeliefert (Cloudflare, Inc.,
              101 Townsend St., San Francisco, CA 94107, USA). Alle Aufrufe laufen über Server von
              Cloudflare, die dabei technisch notwendige Verbindungsdaten wie IP-Adresse, Zeitpunkt,
              aufgerufene Adresse und Browser-Kennung verarbeiten, um die Seite sicher auszuliefern
              und Angriffe abzuwehren. Cloudflare handelt als Auftragsverarbeiter nach Art. 28 DSGVO.
              Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert; Übermittlungen in
              die USA erfolgen auf Grundlage des Angemessenheitsbeschlusses der EU-Kommission (Art. 45
              DSGVO). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse
              liegt in einer sicheren und stabilen Bereitstellung.
            </p>
          </template>

          <h4>E-Mail-Zustellung über Microsoft 365</h4>
          <p>
            Für die E-Mail-Zustellung kann Microsoft 365 beziehungsweise Microsoft Graph genutzt
            werden (Microsoft Ireland Operations Limited, One Microsoft Place, South County Business
            Park, Leopardstown, Dublin 18, Irland). Microsoft verarbeitet Daten dabei als
            Auftragsverarbeiter nach Art. 28 DSGVO. Microsoft ist unter dem EU-US Data Privacy
            Framework zertifiziert; soweit Daten in die USA übermittelt werden, erfolgt dies auf
            Grundlage des Angemessenheitsbeschlusses der EU-Kommission (Art. 45 DSGVO).
          </p>

          <h4>Benachrichtigungen im Browser</h4>
          <p>
            Wer Benachrichtigungen aktiviert, erteilt dafür im Browser eine Einwilligung (Art. 6
            Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Der Browser meldet sich dann beim Push-Dienst
            seines Herstellers an, zum Beispiel Google (Firebase Cloud Messaging), Apple, Mozilla
            oder Microsoft. Die Anwendung speichert nur die vom Browser gelieferte Zustelladresse und
            die zugehörigen Schlüssel. Nachrichten werden Ende-zu-Ende verschlüsselt über den
            Push-Dienst zugestellt; der Dienst sieht den Inhalt nicht, aber technische Daten wie
            Zeitpunkt und Zielgerät. Benachrichtigungen enthalten Schicht, Kalenderwoche und Namen
            der betroffenen Mitarbeitenden, aber keine Gründe für Änderungen. Die Einwilligung lässt
            sich jederzeit über die Glocke in der Anwendung oder in den Browser-Einstellungen
            widerrufen.
          </p>

          <h4>Benachrichtigungen in der Shiftplan-App</h4>
          <p>
            Nutzt jemand die Shiftplan-App mit Benachrichtigungen, laufen Pushes über den
            Push-Dienst push.shiftplan.info von ES Software und Firebase Cloud Messaging (Google
            Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland), auf iPhones zusätzlich
            über den Apple Push Notification Service. Diese Nachrichten sind nicht
            Ende-zu-Ende-verschlüsselt. Automatische Hinweise auf Planänderungen enthalten deshalb
            nur Kalenderwoche und Schicht, keine Namen. Meldet jemand einen Ausfall, erfährt das Team
            Name, Tag und Schicht, aber nie den Grund. Nachrichten der Planung an das Team enthalten
            deren Text. Der Push-Dienst speichert weder Inhalte noch Gerätetokens.
          </p>
          <p>
            Google ist unter dem EU-US Data Privacy Framework zertifiziert; soweit Daten in die USA
            übermittelt werden, erfolgt dies auf Grundlage des Angemessenheitsbeschlusses der
            EU-Kommission (Art. 45 DSGVO). Rechtsgrundlage ist die Einwilligung beim Aktivieren der
            Benachrichtigungen in der App (Art. 6 Abs. 1 lit. a DSGVO), widerrufbar in der App oder
            in den Systemeinstellungen.
          </p>

          <h4>Feiertage und Schulferien</h4>
          <p>
            Feiertage und Schulferien werden serverseitig über die OpenHolidays API abgerufen. Dabei
            werden keine Namen, Kontaktanfragen oder Schichtzuweisungen an OpenHolidays übertragen;
            die Abfrage enthält im Wesentlichen Jahr, Zeitraum und Bundesland.
          </p>
        </section>

        <section id="speicherdauer">
          <h3><span>{{ sectionNumber("speicherdauer") }}</span>{{ sectionTitle("speicherdauer") }}</h3>
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
        </section>

        <section id="app-daten-loeschen">
          <h3><span>{{ sectionNumber("app-daten-loeschen") }}</span>{{ sectionTitle("app-daten-loeschen") }}</h3>
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
        </section>

        <section id="rechte">
          <h3><span>{{ sectionNumber("rechte") }}</span>{{ sectionTitle("rechte") }}</h3>
          <p>
            Betroffene Personen haben nach Maßgabe der DSGVO insbesondere das Recht auf Auskunft,
            Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie
            Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen.
          </p>
          <p>
            Außerdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde. Für Sachsen
            ist dies die
            <a href="https://www.datenschutz.sachsen.de/" target="_blank" rel="noopener noreferrer">
              Sächsische Datenschutz- und Transparenzbeauftragte</a>.
          </p>
        </section>

        <section id="aenderungen">
          <h3><span>{{ sectionNumber("aenderungen") }}</span>{{ sectionTitle("aenderungen") }}</h3>
          <p>
            Diese Datenschutzerklärung wird angepasst, wenn sich Datenflüsse, eingesetzte Dienste
            oder rechtliche Anforderungen ändern. Die jeweils aktuelle Fassung ist auf dieser Seite
            abrufbar.
          </p>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* Fließtext eines Rechtstexts: größer und luftiger als die App-Oberfläche, eine Spalte. */
.privacy {
  scroll-padding-top: 5rem;
}

.privacy-body {
  color: var(--text-2);
  font-size: 1rem;
  line-height: 1.75;
}

.privacy-body section {
  scroll-margin-top: 5rem;
  padding-top: 2rem;
  margin-top: 2rem;
  border-top: 1px solid var(--border-soft);
}

.privacy-body section:first-child {
  padding-top: 0;
  margin-top: 0;
  border-top: 0;
}

.privacy-body h3 {
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
  margin: 0 0 0.875rem;
  color: var(--text-1);
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.privacy-body h3 span {
  min-width: 1.5rem;
  color: var(--text-3);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.privacy-body h4 {
  margin: 1.5rem 0 0.375rem;
  color: var(--text-1);
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.privacy-body p + p,
.privacy-body p + ul,
.privacy-body p + ol,
.privacy-body ul + p,
.privacy-body ol + p,
.privacy-body p + dl {
  margin-top: 0.875rem;
}

.privacy-body ul,
.privacy-body ol {
  margin: 0;
  padding-left: 1.25rem;
}

.privacy-body ul {
  list-style: disc;
}

.privacy-body ol {
  list-style: decimal;
}

.privacy-body li + li {
  margin-top: 0.5rem;
}

.privacy-body li::marker {
  color: var(--text-3);
}

.privacy-body a {
  color: var(--accent-strong);
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, currentColor 35%, transparent);
  text-underline-offset: 4px;
}

.privacy-body a:hover {
  text-decoration-color: currentColor;
}

.privacy-body code {
  padding: 0.0625rem 0.3125rem;
  border-radius: 4px;
  background: var(--surface-muted);
  color: var(--text-1);
  font-size: 0.875em;
}

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
