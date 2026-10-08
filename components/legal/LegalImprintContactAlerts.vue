<script setup lang="ts">
defineProps<{
  invalid: boolean;
  sent: boolean;
  error: string;
}>();
</script>

<template>
  <div
    v-if="invalid"
    class="rounded-lg border border-[color-mix(in_oklab,var(--danger-ink)_24%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger-ink)]"
    role="alert"
  >
    Bitte korrigiere die markierten Felder. Danach kannst du die Nachricht senden.
  </div>

  <div
    v-if="sent"
    class="rounded-lg border border-[color-mix(in_oklab,var(--positive-ink)_24%,transparent)] bg-[var(--positive-soft)] px-4 py-3 text-sm font-medium text-[var(--positive-ink)]"
    role="status"
  >
    Nachricht wurde gesendet.
  </div>

  <div
    v-if="error"
    class="rounded-lg border border-[color-mix(in_oklab,var(--danger-ink)_24%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger-ink)]"
    role="alert"
  >
    {{ error }}
  </div>
</template>
