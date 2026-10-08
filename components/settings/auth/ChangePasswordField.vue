<script setup lang="ts">
// One labelled password input of the change-password dialog.
defineProps<{ inputId: string; label: string; placeholder: string; describedBy?: string }>();
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
      :placeholder="placeholder"
      :aria-describedby="describedBy"
    />
  </div>
</template>
