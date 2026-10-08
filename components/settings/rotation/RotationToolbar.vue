<script setup lang="ts">
defineProps<{
  /** The wizard was left to edit the pattern and can pick up where it stopped. */
  resumable?: boolean;
}>();

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

      <div class="flex flex-wrap gap-2">
        <YearCopy />
        <PrimeButton
          :label="resumable ? 'Assistent fortsetzen' : 'Assistent starten'"
          :icon="resumable ? 'pi pi-arrow-right' : 'pi pi-compass'"
          class="min-h-11 !px-5"
          @click="emit('open-wizard')"
        />
      </div>
    </div>

    <div
      v-if="resumable"
      class="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm leading-6 text-[var(--accent-strong)]"
    >
      Passe das Muster unten an. Wenn alles stimmt, geht es mit <strong>Assistent fortsetzen</strong>
      beim Prüfen weiter.
    </div>
    <div
      v-else
      class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--text-2)]"
    >
      Der Assistent führt dich durch Muster, Prüfung und Ausrollen der Wochenpläne.
    </div>
  </div>
</template>
