<script setup lang="ts">
// Public demo only: shows the published planner credentials and fills them in on request.
defineProps<{ username: string; password: string; disabled: boolean }>();
defineEmits<{ (e: "fill"): void }>();
</script>

<template>
  <div class="mb-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm">
    <p class="font-semibold text-[var(--text-1)]">{{ $t("settings.auth.demo.title") }}</p>
    <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[var(--text-2)]">
      <dt>{{ $t("settings.auth.demo.user") }}</dt>
      <dd class="font-mono text-[var(--text-1)]">{{ username }}</dd>
      <dt>{{ $t("settings.auth.password") }}</dt>
      <dd class="font-mono text-[var(--text-1)]">{{ password }}</dd>
    </dl>
    <p class="mt-2 text-xs leading-5 text-[var(--text-2)]">
      {{ $t("settings.auth.demo.reset") }}
    </p>
    <PrimeButton
      type="button"
      :label="$t('settings.auth.demo.fill')"
      icon="pi pi-sign-in"
      size="small"
      outlined
      class="mt-3 w-full"
      :disabled="disabled"
      @click="$emit('fill')"
    />
  </div>
</template>
