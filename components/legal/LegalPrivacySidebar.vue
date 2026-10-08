<script setup lang="ts">
import { imprintAddressLines } from "~/utils/legal/imprint";
import { PRIVACY_LINK_CLASS as linkClass, PRIVACY_SECTIONS as sections } from "~/utils/legal/privacy";

const runtimeConfig = useRuntimeConfig();

const imprint = computed(() => runtimeConfig.public.imprint || {});
const controllerLines = computed(() => imprintAddressLines(imprint.value));
const hasController = computed(() => controllerLines.value.length > 0);
</script>

<template>
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
</template>
