<script setup lang="ts">
import type { MemberDevice } from "~/types/absence";

// Asks before a device is signed out for good.
defineProps<{ revoking: boolean }>();
const emit = defineEmits<{ (e: "confirm"): void }>();
const device = defineModel<MemberDevice | null>("device");
const { t } = useI18n();

const visible = computed({
  get: () => device.value != null,
  set: (value: boolean) => {
    if (!value) device.value = null;
  },
});
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    :header="t('settings.members.revokeDialog.header')"
    modal
    :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p class="text-sm leading-6">
      {{
        t("settings.members.revokeDialog.text", {
          device: device?.deviceName || t("settings.members.unnamedDevice"),
          name: device?.staffName ?? "",
        })
      }}
    </p>
    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="device = null" />
      <PrimeButton :label="t('settings.members.revoke')" severity="danger" class="min-h-11" :loading="revoking" @click="emit('confirm')" />
    </template>
  </PrimeDialog>
</template>
