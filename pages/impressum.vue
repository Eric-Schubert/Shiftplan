<script setup lang="ts">
definePageMeta({ alias: ["/imprint"] });

// German is the binding version; the English one in components/legal/en is a translation of it.
const { locale } = useI18n();
const english = computed(() => locale.value === "en");
</script>

<template>
  <div class="planner-shell">
    <LegalImprintHeaderEn v-if="english" />
    <LegalImprintHeader v-else />

    <div class="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <LegalImprintProviderEn v-if="english" />
      <LegalImprintProvider v-else />
      <LegalImprintContactEn v-if="english" />
      <LegalImprintContact v-else />
    </div>
  </div>
</template>
