<script setup lang="ts">
import type { MessageKey } from "~/i18n/types";

// Setting, changing or removing the code affects every device of the team, so it needs a confirmation.
const props = defineProps<{ removing: boolean; firstCode: boolean; saving: boolean }>();
const emit = defineEmits<{ (e: "confirm"): void }>();
const visible = defineModel<boolean>("visible", { required: true });

const { t } = useI18n();

// Header, text and button of the three cases.
const KEYS = {
  remove: {
    header: "settings.team.confirm.removeHeader",
    text: "settings.team.confirm.removeText",
    label: "settings.team.confirm.remove",
  },
  first: {
    header: "settings.team.confirm.firstHeader",
    text: "settings.team.confirm.firstText",
    label: "settings.team.confirm.first",
  },
  change: {
    header: "settings.team.confirm.changeHeader",
    text: "settings.team.confirm.changeText",
    label: "settings.team.confirm.change",
  },
} as const satisfies Record<string, Record<"header" | "text" | "label", MessageKey>>;

const keys = computed(() => KEYS[props.removing ? "remove" : props.firstCode ? "first" : "change"]);
const confirmText = computed(() => t(keys.value.text, { keepsPersonal: t("settings.team.confirm.keepsPersonal") }));
const header = computed(() => t(keys.value.header));
const confirmLabel = computed(() => t(keys.value.label));
</script>

<template>
  <PrimeDialog v-model:visible="visible" :header="header" modal :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }">
    <p class="text-sm leading-6">{{ confirmText }}</p>
    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="visible = false" />
      <PrimeButton :label="confirmLabel" :severity="removing ? 'danger' : undefined" class="min-h-11" :loading="saving" @click="emit('confirm')" />
    </template>
  </PrimeDialog>
</template>
