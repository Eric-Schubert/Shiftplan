<script setup lang="ts">
import type { AppLocale } from "~/i18n/config";
import { PRIVACY_SECTIONS as GERMAN } from "~/utils/legal/de/privacy";
import { PRIVACY_SECTIONS as ENGLISH } from "~/utils/legal/en/privacy";
import type { PrivacySection, PrivacySectionId } from "~/utils/legal/privacy";

const props = defineProps<{
  id: PrivacySectionId;
}>();

// The page shows the German or the English sections by the same locale.
const SECTIONS: Record<AppLocale, PrivacySection[]> = { de: GERMAN, en: ENGLISH };
const { locale } = useI18n();
const sections = computed(() => SECTIONS[locale.value]);
const index = computed(() => sections.value.findIndex((section) => section.id === props.id));
</script>

<template>
  <section :id="id">
    <h3>
      <span>{{ index + 1 }}</span
      >{{ sections[index]!.title }}
    </h3>
    <slot />
  </section>
</template>

<style scoped>
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
</style>
