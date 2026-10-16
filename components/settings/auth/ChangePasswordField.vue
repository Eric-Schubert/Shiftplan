<script setup lang="ts">
// One labelled password input of the change-password dialog.
// `autocomplete` tells password managers which one it is, so they neither fill the old one in twice nor save the wrong one.
defineProps<{ inputId: string; label: string; placeholder: string; autocomplete: "current-password" | "new-password"; describedBy?: string }>();
const value = defineModel<string>({ required: true });
</script>

<template>
  <div class="space-y-1.5">
    <label :for="inputId" class="block text-sm font-medium text-[var(--text-2)]">
      {{ label }}
    </label>
    <PrimeInputText
      v-model="value"
      :id="inputId"
      type="password"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :aria-describedby="describedBy"
    />
  </div>
</template>
