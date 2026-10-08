<script setup lang="ts">
const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const { sourceYear, targetYear, overwrite, copying, loading, preview, result, error, canCopy, executeCopy } =
  useYearCopy(() => props.visible);
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Schichtplan kopieren"
    modal
    :style="{ width: '30rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Kopiert alle Schichtzuweisungen von einem Jahr in ein anderes.
        Das Rotationsmuster bleibt unverändert.
      </p>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label for="copy-source-year" class="text-sm font-medium">Von (Quelljahr)</label>
          <PrimeInputNumber
            v-model="sourceYear"
            input-id="copy-source-year"
            :min="2020"
            :max="2100"
            :use-grouping="false"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="copy-target-year" class="text-sm font-medium">Nach (Zieljahr)</label>
          <PrimeInputNumber
            v-model="targetYear"
            input-id="copy-target-year"
            :min="2020"
            :max="2100"
            :use-grouping="false"
          />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <PrimeCheckbox v-model="overwrite" :binary="true" input-id="overwrite" />
        <label for="overwrite" class="text-sm text-gray-700 dark:text-gray-300">
          Bestehende Zuweisungen in {{ targetYear }} überschreiben
        </label>
      </div>

      <YearCopyStatusPanel
        :loading="loading"
        :preview="preview"
        :result="result"
        :error="error"
        :source-year="sourceYear"
        :target-year="targetYear"
        :overwrite="overwrite"
      />
    </div>

    <template #footer>
      <PrimeButton
        label="Schließen"
        text
        class="min-h-11"
        @click="dialogVisible = false"
      />
      <PrimeButton
        label="Kopieren"
        icon="pi pi-copy"
        class="min-h-11"
        :loading="copying"
        :disabled="!canCopy"
        @click="executeCopy"
      />
    </template>
  </PrimeDialog>
</template>
