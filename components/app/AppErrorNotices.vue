<script setup lang="ts">
// Failed actions without their own dialog, bottom right; each closes by itself after a few seconds.
const { notices, dismiss } = useErrorNotices();
const { t } = useI18n();
</script>

<template>
  <div class="pointer-events-none fixed inset-x-3 bottom-3 z-[1200] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[24rem]">
    <div
      v-for="notice in notices"
      :key="notice.id"
      class="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-ink)] shadow-lg"
      role="alert"
    >
      <i class="pi pi-exclamation-triangle mt-0.5" aria-hidden="true"></i>
      <p class="min-w-0 flex-1 leading-5">{{ notice.text }}</p>
      <button type="button" class="-m-1 rounded p-1 hover:opacity-70" :aria-label="t('common.actions.close')" @click="dismiss(notice.id)">
        <i class="pi pi-times text-xs" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>
