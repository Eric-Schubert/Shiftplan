<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

const notFound = computed(() => props.error.statusCode === 404);
const { t } = useI18n();

useHead({ title: () => (notFound.value ? t("app.error.title.notFound") : t("app.error.title.other")) });

function goHome() {
  clearError({ redirect: "/" });
}
</script>

<template>
  <NuxtLayout>
    <div class="flex min-h-[60vh] items-center justify-center">
      <div class="planner-empty w-full max-w-md !items-start !border-solid !bg-[var(--surface)] !p-6 !text-left">
        <span class="planner-chip tabular-nums">{{ t("app.error.code", { code: error.statusCode }) }}</span>
        <div class="space-y-1.5">
          <h2 class="text-xl font-semibold text-[var(--text-1)]">
            {{ notFound ? t("app.error.heading.notFound") : t("app.error.heading.other") }}
          </h2>
          <p class="text-sm leading-6">
            {{ notFound ? t("app.error.text.notFound") : t("app.error.text.other") }}
          </p>
        </div>
        <PrimeButton :label="t('common.actions.toPlan')" icon="pi pi-arrow-left" size="small" class="min-h-9" @click="goHome" />
      </div>
    </div>
  </NuxtLayout>
</template>
