<script setup lang="ts">
const { demoLogin, privacy } = useRuntimeConfig().public;
const isDemo = Boolean(demoLogin?.username && demoLogin?.password);
const usesCloudflare = Boolean(privacy?.cloudflare);

// Microsoft and the push relay are named as this instance is set up. Without an answer both
// stay listed: one recipient too many is better than one missing.
const { data: facts } = await useFetch("/api/legal/privacy");
const usesMicrosoft = computed(() => facts.value?.microsoft ?? true);
const appPush = computed(() => facts.value?.appPush ?? true);
const defaultRelay = computed(() => facts.value?.defaultRelay ?? true);
const relayHost = computed(() => facts.value?.relayHost ?? null);

useSeoMeta({
  title: "Datenschutz | Shiftplan",
  description:
    "Datenschutzerklärung für Shiftplan: welche Daten Planung, Team-App, Kontaktformular und Statistik verarbeiten, wie lange sie gespeichert werden und welche Rechte du hast.",
});
</script>

<template>
  <div class="privacy mx-auto max-w-[72rem] pb-16 pt-2 sm:pt-6">
    <LegalPrivacyHeader :is-demo="isDemo" />

    <LegalPrivacySummary />

    <div class="mt-12 grid gap-10 lg:grid-cols-[15rem_minmax(0,44rem)] lg:gap-16">
      <LegalPrivacySidebar />

      <article class="privacy-body">
        <LegalPrivacyPurpose />
        <LegalPrivacyProcessing :uses-microsoft="usesMicrosoft" />
        <LegalPrivacyServices
          :uses-cloudflare="usesCloudflare"
          :uses-microsoft="usesMicrosoft"
          :app-push="appPush"
          :default-relay="defaultRelay"
          :relay-host="relayHost"
        />
        <LegalPrivacyRetention />
        <LegalPrivacyRights />
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
