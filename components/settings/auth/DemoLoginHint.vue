<script setup lang="ts">
// Public demo only: shows the published planner credentials and fills them in on request.
defineProps<{ username: string; password: string; disabled: boolean }>();
defineEmits<{ (e: "fill"): void }>();
</script>

<template>
  <div class="mb-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm">
    <p class="font-semibold text-[var(--text-1)]">Demo-Zugang</p>
    <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[var(--text-2)]">
      <dt>Benutzer</dt>
      <dd class="font-mono text-[var(--text-1)]">{{ username }}</dd>
      <dt>Passwort</dt>
      <dd class="font-mono text-[var(--text-1)]">{{ password }}</dd>
    </dl>
    <p class="mt-2 text-xs leading-5 text-[var(--text-2)]">
      Die Demo wird regelmäßig zurückgesetzt.
    </p>
    <PrimeButton
      type="button"
      label="Zugangsdaten übernehmen"
      icon="pi pi-sign-in"
      size="small"
      outlined
      class="mt-3 w-full"
      :disabled="disabled"
      @click="$emit('fill')"
    />
  </div>
</template>
