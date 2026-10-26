<script setup lang="ts">
import { toPrivacyFacts } from "~/utils/legal/privacy-facts";

definePageMeta({ alias: ["/privacy"], layout: "legal" });

const { demoLogin, privacy } = useRuntimeConfig().public;
const isDemo = Boolean(demoLogin?.username && demoLogin?.password);
const usesCloudflare = Boolean(privacy?.cloudflare);
const hoster = String(privacy?.hoster || "").trim();

// Microsoft, the push relay, periods and cookie names as this instance is set up.
const { data } = await useFetch("/api/legal/privacy");
const facts = computed(() => toPrivacyFacts(data.value));
const services = computed(() => {
  const { microsoft, appPush, defaultRelay, relayHost } = facts.value;
  return { hoster, usesCloudflare, usesMicrosoft: microsoft, appPush, defaultRelay, relayHost };
});

// German is the binding version; the English one in components/legal/en is a translation of it.
const { locale } = useI18n();
const english = computed(() => locale.value === "en");
</script>

<template>
  <div class="privacy mx-auto max-w-[72rem] pb-16 pt-2 sm:pt-6">
    <LegalPrivacyHeaderEn v-if="english" :is-demo="isDemo" />
    <LegalPrivacyHeader v-else :is-demo="isDemo" />

    <LegalPrivacySummaryEn v-if="english" :retention="facts.retentionDays" />
    <LegalPrivacySummary v-else :retention="facts.retentionDays" />

    <div class="mt-12 grid gap-10 lg:grid-cols-[15rem_minmax(0,44rem)] lg:gap-16">
      <LegalPrivacySidebarEn v-if="english" />
      <LegalPrivacySidebar v-else />

      <article class="privacy-body">
        <LegalPrivacyPurposeEn v-if="english" :retention="facts.retentionDays" />
        <LegalPrivacyPurpose v-else :retention="facts.retentionDays" />
        <LegalPrivacyProcessingEn v-if="english" :uses-microsoft="facts.microsoft" :retention="facts.retentionDays" :session="facts.session" />
        <LegalPrivacyProcessing v-else :uses-microsoft="facts.microsoft" :retention="facts.retentionDays" :session="facts.session" />
        <LegalPrivacyServicesEn v-if="english" v-bind="services" />
        <LegalPrivacyServices v-else v-bind="services" />
        <LegalPrivacyRetentionEn v-if="english" :retention="facts.retentionDays" :session="facts.session" />
        <LegalPrivacyRetention v-else :retention="facts.retentionDays" :session="facts.session" />
        <LegalPrivacyRightsEn v-if="english" />
        <LegalPrivacyRights v-else />
      </article>
    </div>
  </div>
</template>

<style scoped>
/* Body text of a legal page: larger and airier than the app UI, one column. */
.privacy {
  scroll-padding-top: 5rem;
}

.privacy-body {
  color: var(--text-2);
  font-size: 1rem;
  line-height: 1.75;
}

/* The sections are child components, so their text is reached with :deep(). */
.privacy-body :deep(p + p),
.privacy-body :deep(p + ul),
.privacy-body :deep(p + ol),
.privacy-body :deep(ul + p),
.privacy-body :deep(ol + p),
.privacy-body :deep(p + dl) {
  margin-top: 0.875rem;
}

.privacy-body :deep(ul),
.privacy-body :deep(ol) {
  margin: 0;
  padding-left: 1.25rem;
}

.privacy-body :deep(ul) {
  list-style: disc;
}

.privacy-body :deep(ol) {
  list-style: decimal;
}

.privacy-body :deep(li + li) {
  margin-top: 0.5rem;
}

.privacy-body :deep(li::marker) {
  color: var(--text-3);
}

.privacy-body :deep(a) {
  color: var(--accent-strong);
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, currentColor 35%, transparent);
  text-underline-offset: 4px;
}

.privacy-body :deep(a:hover) {
  text-decoration-color: currentColor;
}

.privacy-body :deep(h4) {
  margin: 1.5rem 0 0.375rem;
  color: var(--text-1);
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.privacy-body :deep(code) {
  padding: 0.0625rem 0.3125rem;
  border-radius: 4px;
  background: var(--surface-muted);
  color: var(--text-1);
  font-size: 0.875em;
}
</style>
