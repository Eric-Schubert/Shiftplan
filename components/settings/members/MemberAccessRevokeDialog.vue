<script setup lang="ts">
import type { MemberDevice } from "~/types/absence";

// Asks before a device is signed out for good.
defineProps<{ revoking: boolean }>();
const emit = defineEmits<{ (e: "confirm"): void }>();
const device = defineModel<MemberDevice | null>("device");

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
    header="Gerät sperren"
    modal
    :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p class="text-sm leading-6">
      „{{ device?.deviceName || "Unbenanntes Gerät" }}“ von {{ device?.staffName }} wird abgemeldet und
      bekommt keine Benachrichtigungen mehr. Für einen neuen Zugang einfach einen neuen QR-Code erzeugen.
    </p>
    <template #footer>
      <PrimeButton label="Abbrechen" text @click="device = null" />
      <PrimeButton label="Sperren" severity="danger" class="min-h-11" :loading="revoking" @click="emit('confirm')" />
    </template>
  </PrimeDialog>
</template>
