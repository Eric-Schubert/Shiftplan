<script setup lang="ts">
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "~/shared/utils/limits";

// New PIN twice; the parent reads `pin` once both match.
const props = defineProps<{ disabled?: boolean; idPrefix: string }>();
const pin = defineModel<string>("pin", { default: "" });
const repeat = defineModel<string>("repeat", { default: "" });
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div class="space-y-1.5">
      <label :for="`${props.idPrefix}-pin`" class="block font-medium text-[var(--text-2)]">{{ $t("member.pin.new") }}</label>
      <PrimeInputText
        :id="`${props.idPrefix}-pin`"
        v-model="pin"
        type="password"
        inputmode="numeric"
        autocomplete="new-password"
        :maxlength="PIN_MAX_LENGTH"
        class="w-full font-mono tracking-widest"
        :disabled="disabled"
      />
    </div>
    <div class="space-y-1.5">
      <label :for="`${props.idPrefix}-repeat`" class="block font-medium text-[var(--text-2)]">{{ $t("member.pin.repeat") }}</label>
      <PrimeInputText
        :id="`${props.idPrefix}-repeat`"
        v-model="repeat"
        type="password"
        inputmode="numeric"
        autocomplete="new-password"
        :maxlength="PIN_MAX_LENGTH"
        class="w-full font-mono tracking-widest"
        :disabled="disabled"
      />
    </div>
    <p class="col-span-2 text-xs text-[var(--text-3)]">
      {{ $t("member.pin.hint", { min: PIN_MIN_LENGTH, max: PIN_MAX_LENGTH }) }}
    </p>
  </div>
</template>
