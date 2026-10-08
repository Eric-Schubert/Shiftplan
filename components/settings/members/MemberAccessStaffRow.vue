<script setup lang="ts">
import type { MemberDevice } from "~/types/absence";
import type { Staff } from "~/types/staff";
import { formatTimestamp } from "~/utils/timestamp";

// One person in the app access list: PIN state, signed-in devices and the QR code button.
defineProps<{
  member: Staff;
  devices?: MemberDevice[];
  hasPin: boolean;
  resettingPin: boolean;
  creating: boolean;
}>();
const emit = defineEmits<{
  (e: "reset-pin"): void;
  (e: "revoke", device: MemberDevice): void;
  (e: "invite"): void;
}>();
</script>

<template>
  <li class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
    <div class="min-w-0 flex-1">
      <p class="font-medium text-[var(--text-1)]">
        {{ member.name }}
        <span v-if="member.short_code" class="ml-1 font-mono text-xs font-semibold text-[var(--text-3)]">{{ member.short_code }}</span>
      </p>
      <p class="text-xs text-[var(--text-3)]">
        <template v-if="hasPin">
          PIN festgelegt ·
          <button
            type="button"
            class="font-semibold text-[var(--danger-ink)] hover:underline disabled:opacity-50"
            :disabled="resettingPin"
            @click="emit('reset-pin')"
          >
            PIN zurücksetzen
          </button>
        </template>
        <template v-else>Noch keine PIN</template>
      </p>
      <p v-if="!devices" class="text-xs text-[var(--text-3)]">Noch kein Gerät eingerichtet</p>
      <ul v-else class="mt-1 space-y-1">
        <li
          v-for="device in devices"
          :key="device.sessionId"
          class="flex items-center gap-2 text-xs text-[var(--text-2)]"
        >
          <i class="pi pi-mobile text-[0.7rem]" aria-hidden="true"></i>
          <span>{{ device.deviceName || "Unbenanntes Gerät" }}</span>
          <span class="text-[var(--text-3)]">· zuletzt {{ formatTimestamp(device.lastSeenAt) }}</span>
          <button
            type="button"
            class="ml-1 font-semibold text-[var(--danger-ink)] hover:underline"
            @click="emit('revoke', device)"
          >
            Sperren
          </button>
        </li>
      </ul>
    </div>
    <PrimeButton
      label="QR-Code erzeugen"
      icon="pi pi-qrcode"
      size="small"
      severity="secondary"
      outlined
      class="min-h-9 self-start sm:self-center"
      :loading="creating"
      @click="emit('invite')"
    />
  </li>
</template>
