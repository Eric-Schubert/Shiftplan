<script setup lang="ts">
import { PRIVACY_SECTIONS as sections } from "~/utils/legal/en/privacy";
import { imprintAddressLines } from "~/utils/legal/imprint";
import { PRIVACY_LINK_CLASS as linkClass } from "~/utils/legal/privacy";

const runtimeConfig = useRuntimeConfig();

const imprint = computed(() => runtimeConfig.public.imprint || {});
const controllerLines = computed(() => imprintAddressLines(imprint.value));
const hasController = computed(() => controllerLines.value.length > 0);
</script>

<template>
  <aside class="lg:sticky lg:top-24 lg:h-fit">
    <h3 class="text-sm font-semibold text-[var(--text-1)]">Controller</h3>
    <address v-if="hasController" class="mt-2 not-italic text-[0.9375rem] leading-6 text-[var(--text-2)]">
      <span v-for="line in controllerLines" :key="line" class="block">{{ line }}</span>
    </address>
    <p v-else class="mt-2 text-[0.9375rem] leading-6 text-[var(--text-2)]">
      The provider's details are maintained in the application's legal notice configuration.
    </p>
    <p v-if="imprint.publicEmail" class="mt-2 text-[0.9375rem] leading-6">
      <a :href="`mailto:${imprint.publicEmail}`" :class="linkClass">{{ imprint.publicEmail }}</a>
    </p>
    <p class="mt-2 text-sm leading-6 text-[var(--text-3)]">Data protection requests can be sent by email or via the contact form in the legal notice.</p>

    <nav aria-label="Contents" class="mt-8 hidden lg:block">
      <h3 class="text-sm font-semibold text-[var(--text-1)]">Contents</h3>
      <ol class="mt-2 space-y-1 text-sm leading-6">
        <li v-for="(section, index) in sections" :key="section.id" class="flex gap-2">
          <span class="w-5 flex-shrink-0 tabular-nums text-[var(--text-3)]">{{ index + 1 }}</span>
          <a :href="`#${section.id}`" class="text-[var(--text-2)] hover:text-[var(--text-1)]">{{ section.title }}</a>
        </li>
      </ol>
    </nav>
  </aside>
</template>
