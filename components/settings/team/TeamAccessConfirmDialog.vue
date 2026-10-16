<script setup lang="ts">
// Setting, changing or removing the code affects every device of the team, so it needs a confirmation.
const props = defineProps<{ removing: boolean; firstCode: boolean; saving: boolean }>();
const emit = defineEmits<{ (e: "confirm"): void }>();
const visible = defineModel<boolean>("visible", { required: true });

const { t } = useI18n();

// Text keys of the three cases: remove, first code, change.
const mode = computed(() => (props.removing ? "remove" : props.firstCode ? "first" : "change"));
const confirmText = computed(() =>
  t(`settings.team.confirm.${mode.value}Text`, { keepsPersonal: t("settings.team.confirm.keepsPersonal") })
);
const header = computed(() => t(`settings.team.confirm.${mode.value}Header`));
const confirmLabel = computed(() => t(`settings.team.confirm.${mode.value}`));
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    :header="header"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p class="text-sm leading-6">{{ confirmText }}</p>
    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="visible = false" />
      <PrimeButton
        :label="confirmLabel"
        :severity="removing ? 'danger' : undefined"
        class="min-h-11"
        :loading="saving"
        @click="emit('confirm')"
      />
    </template>
  </PrimeDialog>
</template>
