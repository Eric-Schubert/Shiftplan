<script setup lang="ts">
import { formatTimestamp } from "~/utils/timestamp";

// Personal QR code and fallback code for one person, shown right after it was created.
defineProps<{
  invite: { staffName: string; code: string; expiresAt: number } | null;
  qrSvg: string;
}>();
const emit = defineEmits<{ (e: "done"): void }>();
const visible = defineModel<boolean>("visible", { required: true });

function done() {
  visible.value = false;
  emit("done");
}
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    :header="`App-Zugang für ${invite?.staffName}`"
    modal
    :style="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div v-if="invite" class="space-y-3 text-center text-sm">
      <div
        class="mx-auto h-56 w-56 rounded-xl border border-[var(--border-soft)] bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
        role="img"
        :aria-label="`Persönlicher QR-Code für ${invite.staffName}`"
        v-html="qrSvg"
      ></div>
      <p class="text-[var(--text-2)]">Mit der Shiftplan-App scannen oder im Browser öffnen. Ohne Kamera geht auch der Code:</p>
      <p class="font-mono text-xl font-semibold tracking-widest text-[var(--text-1)]">{{ invite.code }}</p>
      <p class="text-xs text-[var(--text-3)]">
        Gültig bis {{ formatTimestamp(invite.expiresAt) }}, nur einmal nutzbar. Nur an {{ invite.staffName }} weitergeben.
      </p>
    </div>
    <template #footer>
      <PrimeButton label="Fertig" class="min-h-11" @click="done" />
    </template>
  </PrimeDialog>
</template>
