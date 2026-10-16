<script setup lang="ts">
import { weekOfYearLabel } from "~/shared/utils/format/week";

defineProps<{
  /** The wizard was left to edit the pattern and can pick up where it stopped. */
  resumable?: boolean;
}>();

const emit = defineEmits<{
  (e: "open-wizard"): void;
}>();

const dataStore = useDataStore();
const localeTag = useLocaleTag();
const { t } = useI18n();
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div v-if="dataStore.rotationPattern">
        <p class="planner-kicker">{{ t("settings.tabs.rotation") }}</p>
        <p class="mt-2 text-sm text-[var(--text-2)]">
          <strong class="text-[var(--text-1)]">
            {{ t("settings.rotation.cycle", { weeks: dataStore.rotationPattern.config.cycle_length }) }}
          </strong>
          {{
            t("settings.rotation.toolbar.start", {
              week: weekOfYearLabel(localeTag, dataStore.rotationPattern.config.start_year, dataStore.rotationPattern.config.start_week),
            })
          }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <YearCopy />
        <PrimeButton
          :label="resumable ? t('settings.rotation.toolbar.resumeWizard') : t('settings.rotation.toolbar.startWizard')"
          :icon="resumable ? 'pi pi-arrow-right' : 'pi pi-compass'"
          class="min-h-11 !px-5"
          @click="emit('open-wizard')"
        />
      </div>
    </div>

    <i18n-t
      v-if="resumable"
      keypath="settings.rotation.toolbar.resumeHint"
      tag="div"
      class="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm leading-6 text-[var(--accent-strong)]"
    >
      <template #resume
        ><strong>{{ t("settings.rotation.toolbar.resumeWizard") }}</strong></template
      >
    </i18n-t>
    <div v-else class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--text-2)]">
      {{ t("settings.rotation.toolbar.hint") }}
    </div>
  </div>
</template>
