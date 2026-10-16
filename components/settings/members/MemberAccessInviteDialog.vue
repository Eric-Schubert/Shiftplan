<script setup lang="ts">
import { formatTimestamp } from "~/shared/utils/format/time";

// Personal QR code and fallback code for one person, shown right after it was created.
defineProps<{
  invite: { staffName: string; code: string; expiresAt: number } | null;
  qrSvg: string;
}>();
const emit = defineEmits<{ (e: "done"): void }>();
const visible = defineModel<boolean>("visible", { required: true });
const localeTag = useLocaleTag();
const { t } = useI18n();

function done() {
  visible.value = false;
  emit("done");
}
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    :header="t('settings.members.invite.header', { name: invite?.staffName ?? '' })"
    modal
    :style="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div v-if="invite" class="space-y-3 text-center text-sm">
      <div
        class="mx-auto h-56 w-56 rounded-xl border border-[var(--border-soft)] bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
        role="img"
        :aria-label="t('settings.members.invite.qrLabel', { name: invite.staffName })"
        v-html="qrSvg"
      ></div>
      <p class="text-[var(--text-2)]">{{ t("settings.members.invite.scan") }}</p>
      <p class="font-mono text-xl font-semibold tracking-widest text-[var(--text-1)]">{{ invite.code }}</p>
      <p class="text-xs text-[var(--text-3)]">
        {{ t("settings.members.invite.validUntil", { until: formatTimestamp(localeTag, invite.expiresAt), name: invite.staffName }) }}
      </p>
    </div>
    <template #footer>
      <PrimeButton :label="t('common.actions.done')" class="min-h-11" @click="done" />
    </template>
  </PrimeDialog>
</template>
