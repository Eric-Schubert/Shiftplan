<script setup lang="ts">
import { PRIVACY_LINK_CLASS as linkClass } from "~/utils/legal/privacy";

defineProps<{
  isDemo: boolean;
}>();

const lastUpdated = "Oktober 2026";
</script>

<template>
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
</template>
