<template>
  <section
    aria-labelledby="kurz"
    class="mt-10 max-w-[44rem] rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6"
  >
    <h3 id="kurz" class="text-lg font-semibold text-[var(--text-1)]">Das Wichtigste in Kürze</h3>
    <ul class="mt-4 divide-y divide-[var(--border-soft)] text-[0.9375rem] leading-6">
      <li class="py-3 first:pt-0">
        <strong class="text-[var(--text-1)]">Gründe für Ausfälle sieht nur die Planung.</strong>
        <span class="text-[var(--text-2)]"> Wer den Plan sehen kann, erfährt nur, wer fehlt. Gründe werden nach 90 Tagen gelöscht.</span>
      </li>
      <li class="py-3">
        <strong class="text-[var(--text-1)]">Kein Konto mit E-Mail-Adresse für Mitarbeitende.</strong>
        <span class="text-[var(--text-2)]"> Der persönliche Zugang in App und Browser startet mit einem QR-Code der Planung, danach geht auch die Anmeldung mit Kürzel und selbst gewählter PIN. E-Mail-Adresse oder Telefonnummer sind nicht nötig.</span>
      </li>
      <li class="py-3">
        <strong class="text-[var(--text-1)]">App-Hinweise auf Planänderungen nennen keine Namen.</strong>
        <span class="text-[var(--text-2)]"> Sie sind nicht Ende-zu-Ende-verschlüsselt und enthalten deshalb nur Woche und Schicht. Namen stehen nur in Ausfallmeldungen, Anfragen und Nachrichten der Planung.</span>
      </li>
      <li class="py-3">
        <strong class="text-[var(--text-1)]">Keine Werbung, kein Tracking.</strong>
        <span class="text-[var(--text-2)]"> Die eigene Besuchsstatistik speichert keine IP-Adressen im Klartext und wird nach 90 Tagen bereinigt. Außer den Push-Nachrichten selbst gehen an Google und Apple nur technische Daten für die Push-Anmeldung, den Update-Hinweis und (Android) den QR-Scanner.</span>
      </li>
      <li class="py-3 last:pb-0">
        <strong class="text-[var(--text-1)]">Cookies nur für Anmeldung und Zugang.</strong>
        <span class="text-[var(--text-2)]"> Sie sind technisch nötig, deshalb gibt es kein Cookie-Banner.</span>
      </li>
    </ul>
  </section>
</template>
