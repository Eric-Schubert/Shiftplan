<script setup lang="ts">
// After the code: choose a PIN for signing in on other devices, or skip for now.
defineProps<{ busy: boolean; error: string; shortCode?: string | null }>();
const emit = defineEmits<{ (e: "submit"): void; (e: "later"): void }>();
const pin = defineModel<string>("pin", { required: true });
const repeat = defineModel<string>("repeat", { required: true });
</script>

<template>
  <form class="space-y-4 text-sm" @submit.prevent="emit('submit')">
    <p class="text-[var(--text-2)]">
      Du bist angemeldet. Lege jetzt eine PIN fest, dann kannst du dich auf jedem Gerät mit deinem Kürzel
      <span class="font-mono font-semibold text-[var(--text-1)]">{{ shortCode }}</span> anmelden.
    </p>
    <MemberPinFields v-model:pin="pin" v-model:repeat="repeat" id-prefix="member-new" :disabled="busy" />
    <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    <div class="flex gap-2">
      <PrimeButton label="Später" text class="min-h-11" :disabled="busy" @click="emit('later')" />
      <PrimeButton type="submit" label="PIN speichern" icon="pi pi-check" class="min-h-11 flex-1" :loading="busy" />
    </div>
  </form>
</template>
