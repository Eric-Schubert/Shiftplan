<script setup lang="ts">
const emit = defineEmits<{
  (e: "open-wizard"): void;
}>();

const dataStore = useDataStore();
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div v-if="dataStore.rotationPattern">
        <p class="planner-kicker">Rotationsmuster</p>
        <p class="mt-2 text-sm text-[var(--text-2)]">
          <strong class="text-[var(--text-1)]">
            {{ dataStore.rotationPattern.config.cycle_length }}-Wochen-Zyklus
          </strong>
          &middot; Start: KW {{ dataStore.rotationPattern.config.start_week }}/{{
            dataStore.rotationPattern.config.start_year
          }}
        </p>
      </div>

      <PrimeButton
        label="Assistent starten"
        icon="pi pi-compass"
        class="min-h-11 !rounded-full !px-5"
        @click="emit('open-wizard')"
      />
    </div>

    <div class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--text-2)]">
      Fuehrt dich durch Excel-Import, Musterpruefung und Jahresausrollung in einem Ablauf.
    </div>
  </div>
</template>
