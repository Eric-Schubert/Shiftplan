<script setup lang="ts">
defineProps<{
  id: string;
  label: string;
  error?: string;
}>();
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="block text-sm font-medium text-[var(--text-2)]">
      {{ label }}
    </label>
    <slot />
    <p
      v-if="error"
      :id="`${id}-error`"
      class="text-xs font-medium leading-5 text-[var(--danger-ink)]"
    >
      {{ error }}
    </p>
    <slot name="hint" />
  </div>
</template>
