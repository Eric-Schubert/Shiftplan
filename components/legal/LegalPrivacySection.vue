<script setup lang="ts">
import { PRIVACY_SECTIONS, type PrivacySectionId } from "~/utils/legal/privacy";

const props = defineProps<{
  id: PrivacySectionId;
}>();

const index = computed(() => PRIVACY_SECTIONS.findIndex((section) => section.id === props.id));
</script>

<template>
  <section :id="id">
    <h3><span>{{ index + 1 }}</span>{{ PRIVACY_SECTIONS[index]!.title }}</h3>
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
