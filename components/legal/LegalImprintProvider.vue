<script setup lang="ts">
import { imprintAddressLines } from "~/utils/legal/imprint";

const runtimeConfig = useRuntimeConfig();

const imprint = computed(() => runtimeConfig.public.imprint || {});
const addressLines = computed(() => imprintAddressLines(imprint.value));

const hasCoreImprint = computed(
  () =>
    Boolean(imprint.value.providerName) &&
    Boolean(imprint.value.streetAddress) &&
    Boolean(imprint.value.postalCode) &&
    Boolean(imprint.value.city)
);
// § 5 Abs. 1 DDG also requires an e-mail address. Without it the data shows with a warning.
const missingEmail = computed(() => !imprint.value.publicEmail);
// W-IdNr. (§ 139c AO): DE123456789-00001, USt-IdNr.: DE123456789.
const taxIdLabel = computed(() => (/-\d{5}$/.test(imprint.value.vatId ?? "") ? "W-IdNr." : "USt-IdNr."));
</script>

<template>
  <section class="planner-panel">
    <p class="planner-kicker">Verantwortlich</p>

    <div v-if="hasCoreImprint" class="mt-4 space-y-5">
      <address class="not-italic text-base leading-7 text-[var(--text-1)]">
        <span
          v-for="line in addressLines"
          :key="line"
          class="block"
        >
          {{ line }}
        </span>
      </address>

      <dl class="space-y-3 text-sm">
        <div v-if="imprint.representedBy" class="grid gap-1">
          <dt class="font-semibold text-[var(--text-1)]">Vertreten durch</dt>
          <dd class="text-[var(--text-2)]">{{ imprint.representedBy }}</dd>
        </div>

        <div v-if="imprint.publicEmail" class="grid gap-1">
          <dt class="font-semibold text-[var(--text-1)]">E-Mail</dt>
          <dd>
            <a
              :href="`mailto:${imprint.publicEmail}`"
              class="font-medium text-[var(--accent-strong)] underline decoration-transparent underline-offset-4 transition hover:decoration-current"
            >
              {{ imprint.publicEmail }}
            </a>
          </dd>
        </div>

        <div v-if="imprint.phone" class="grid gap-1">
          <dt class="font-semibold text-[var(--text-1)]">Telefon</dt>
          <dd class="text-[var(--text-2)]">{{ imprint.phone }}</dd>
        </div>

        <div v-if="imprint.registerCourt || imprint.registerNumber" class="grid gap-1">
          <dt class="font-semibold text-[var(--text-1)]">Register</dt>
          <dd class="text-[var(--text-2)]">
            {{ [imprint.registerCourt, imprint.registerNumber].filter(Boolean).join(", ") }}
          </dd>
        </div>

        <div v-if="imprint.vatId" class="grid gap-1">
          <dt class="font-semibold text-[var(--text-1)]">{{ taxIdLabel }}</dt>
          <dd class="text-[var(--text-2)]">{{ imprint.vatId }}</dd>
        </div>
      </dl>
    </div>

    <div v-if="!hasCoreImprint || missingEmail" class="mt-4 rounded-lg border border-[var(--border-soft)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-ink)]">
      Das Impressum ist noch nicht vollständig konfiguriert.
    </div>
  </section>
</template>
