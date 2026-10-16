<script setup lang="ts">
import type { Absence } from "~/types/absence";
import { removalNotice } from "~/utils/absence-removal";

// Asks before an absence goes; a running range only ends today.
defineProps<{ removing: boolean }>();
const emit = defineEmits<{ (e: "confirm", absence: Absence): void }>();
const absence = defineModel<Absence | null>("absence");

const localeTag = useLocaleTag();
const notice = computed(() => (absence.value ? removalNotice(localeTag.value, absence.value) : null));
const visible = computed({
  get: () => absence.value != null,
  set: (value: boolean) => {
    if (!value) absence.value = null;
  },
});
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    :header="$t('absence.remove.header')"
    modal
    :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p class="text-sm leading-6">{{ notice ? $t(notice.text.key, notice.text.params ?? {}) : "" }}</p>
    <template #footer>
      <PrimeButton :label="$t('common.actions.cancel')" text @click="absence = null" />
      <PrimeButton
        :label="notice ? $t(notice.confirm) : undefined"
        severity="danger"
        class="min-h-11"
        :loading="removing"
        @click="absence && emit('confirm', absence)"
      />
    </template>
  </PrimeDialog>
</template>
