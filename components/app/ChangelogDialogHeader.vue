<script setup lang="ts">
defineProps<{
  history: boolean;
  eyebrow: string;
  title: string;
  version: string;
  hasBuildMetadata: boolean;
}>();
</script>

<template>
  <div class="changelog-dialog__header">
    <div class="changelog-dialog__icon">
      <i
        :class="[history ? 'pi pi-history' : 'pi pi-info-circle', 'text-xl']"
        aria-hidden="true"
      ></i>
    </div>

    <div class="min-w-0 flex-1">
      <p class="changelog-dialog__eyebrow">
        {{ eyebrow }}
      </p>
      <h2 class="changelog-dialog__title">
        {{ title }}
      </h2>
      <div class="changelog-dialog__meta">
        <span class="changelog-badge changelog-badge--accent">
          Installiert {{ version }}
        </span>
        <span
          v-if="hasBuildMetadata"
          class="changelog-badge"
        >
          Entwicklungsstand
        </span>
      </div>
    </div>
  </div>
</template>
