<script setup lang="ts">
useSeoMeta({
  title: "Legal notice | Shiftplan",
  description: "Provider identification and contact option for Shiftplan.",
});
</script>

<template>
  <section class="planner-slab">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-3">
        <p class="planner-kicker">Provider identification</p>
        <div>
          <h2 class="text-2xl font-semibold text-[var(--text-1)] sm:text-3xl">Legal notice</h2>
          <p class="mt-2 max-w-[48rem] text-sm leading-6 text-[var(--text-2)]">
            Information pursuant to Section 5 of the German Digital Services Act (Digitale-Dienste-Gesetz, DDG) on the provider responsible for this
            application.
          </p>
        </div>
      </div>

      <NuxtLink to="/" class="shrink-0">
        <PrimeButton label="Back to the shift plan" icon="pi pi-arrow-left" severity="secondary" outlined class="min-h-11" />
      </NuxtLink>
    </div>
    <LegalTranslationNotice class="mt-4" />
  </section>
</template>
