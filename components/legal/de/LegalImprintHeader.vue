<script setup lang="ts">
useSeoMeta({
  title: "Impressum | Shiftplan",
  description: "Anbieterkennzeichnung und Kontaktmöglichkeit für Shiftplan.",
});
</script>

<template>
  <section class="planner-slab">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-3">
        <p class="planner-kicker">Anbieterkennzeichnung</p>
        <div>
          <h2 class="text-2xl font-semibold text-[var(--text-1)] sm:text-3xl">Impressum</h2>
          <p class="mt-2 max-w-[48rem] text-sm leading-6 text-[var(--text-2)]">Angaben gemäß § 5 DDG zum verantwortlichen Anbieter dieser Anwendung.</p>
        </div>
      </div>

      <NuxtLink to="/">
        <PrimeButton label="Zum Schichtplan" icon="pi pi-arrow-left" severity="secondary" outlined class="min-h-11" />
      </NuxtLink>
    </div>
  </section>
</template>
