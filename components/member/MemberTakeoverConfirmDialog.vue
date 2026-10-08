<script setup lang="ts">
import type { ShiftRequest } from "~/types/shift-request";
import { formatRequestPeriod } from "~/utils/request-period";

// Taking over a shift also signs the member out of their own shift that day.
defineProps<{ busy: boolean }>();
const emit = defineEmits<{ (e: "confirm", request: ShiftRequest): void }>();
const request = defineModel<ShiftRequest | null>("request");
</script>

<template>
  <PrimeDialog
    :visible="request != null"
    header="Schicht übernehmen?"
    modal
    :style="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    @update:visible="!$event && (request = null)"
  >
    <p v-if="request" class="text-sm text-[var(--text-2)]">
      Du übernimmst {{ request.shift_name }} am {{ formatRequestPeriod(request) }} für {{ request.requester_name }}. Hast du an
      dem Tag eine eigene Schicht, wirst du dort ausgetragen.
    </p>
    <template #footer>
      <PrimeButton label="Abbrechen" text @click="request = null" />
      <PrimeButton
        label="Übernehmen"
        icon="pi pi-check"
        :loading="busy"
        @click="request && emit('confirm', request)"
      />
    </template>
  </PrimeDialog>
</template>
