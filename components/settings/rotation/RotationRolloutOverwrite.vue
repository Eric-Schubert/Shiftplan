<script setup lang="ts">
defineProps<{
  plannedCount: number;
  totalCount: number;
}>();

const overwrite = defineModel<boolean>({ required: true });
</script>

<template>
  <div
    class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-2)]"
  >
    <p class="text-[var(--text-1)]">
      <strong>{{ plannedCount }} von {{ totalCount }} Wochen</strong>
      sind schon geplant.
    </p>
    <label class="mt-3 flex cursor-pointer items-start gap-3">
      <PrimeCheckbox v-model="overwrite" input-id="rollout-overwrite" binary class="mt-0.5" />
      <span>
        <span class="block font-medium text-[var(--text-1)]">Geplante Wochen überschreiben</span>
        <span class="block leading-5">
          <template v-if="overwrite">
            Diese Wochen werden komplett neu aus dem Muster befüllt. Manuelle Änderungen darin
            gehen verloren.
          </template>
          <template v-else>
            Aus: geplante Wochen bleiben, wie sie sind. Nur leere Wochen werden befüllt.
          </template>
        </span>
      </span>
    </label>
  </div>
</template>
