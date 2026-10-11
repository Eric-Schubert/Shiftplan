<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

const notFound = computed(() => props.error.statusCode === 404);

useHead({ title: () => (notFound.value ? "Seite nicht gefunden · Shiftplan" : "Fehler · Shiftplan") });

function goHome() {
  clearError({ redirect: "/" });
}
</script>

<template>
  <NuxtLayout>
    <div class="flex min-h-[60vh] items-center justify-center">
      <div class="planner-empty w-full max-w-md !items-start !border-solid !bg-[var(--surface)] !p-6 !text-left">
        <span class="planner-chip tabular-nums">Fehler {{ error.statusCode }}</span>
        <div class="space-y-1.5">
          <h2 class="text-xl font-semibold text-[var(--text-1)]">
            {{ notFound ? "Diese Seite gibt es nicht" : "Da ist etwas schiefgelaufen" }}
          </h2>
          <p class="text-sm leading-6">
            {{
              notFound
                ? "Der Link ist veraltet oder vertippt. Der Schichtplan selbst ist weiter erreichbar."
                : "Der Server hat die Anfrage nicht verarbeitet. Lade die Seite neu oder versuch es gleich noch mal."
            }}
          </p>
        </div>
        <PrimeButton
          label="Zum Schichtplan"
          icon="pi pi-arrow-left"
          size="small"
          class="min-h-9"
          @click="goHome"
        />
      </div>
    </div>
  </NuxtLayout>
</template>
