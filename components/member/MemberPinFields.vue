<script setup lang="ts">
// New PIN twice; the parent reads `pin` once both match.
const props = defineProps<{ disabled?: boolean; idPrefix: string }>();
const pin = defineModel<string>("pin", { default: "" });
const repeat = defineModel<string>("repeat", { default: "" });
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div class="space-y-1.5">
      <label :for="`${props.idPrefix}-pin`" class="block font-medium text-[var(--text-2)]">Neue PIN</label>
      <PrimeInputText
        :id="`${props.idPrefix}-pin`"
        v-model="pin"
        type="password"
        inputmode="numeric"
        autocomplete="new-password"
        maxlength="12"
        class="w-full font-mono tracking-widest"
        :disabled="disabled"
      />
    </div>
    <div class="space-y-1.5">
      <label :for="`${props.idPrefix}-repeat`" class="block font-medium text-[var(--text-2)]">Wiederholen</label>
      <PrimeInputText
        :id="`${props.idPrefix}-repeat`"
        v-model="repeat"
        type="password"
        inputmode="numeric"
        autocomplete="new-password"
        maxlength="12"
        class="w-full font-mono tracking-widest"
        :disabled="disabled"
      />
    </div>
    <p class="col-span-2 text-xs text-[var(--text-3)]">6 bis 12 Ziffern. Damit meldest du dich auf jedem Gerät an.</p>
  </div>
</template>
