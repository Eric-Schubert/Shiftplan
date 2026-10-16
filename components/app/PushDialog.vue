<script setup lang="ts">
const { state, dialogOpen, enable, disable } = usePushNotifications();
const busy = ref(false);
const error = ref("");
const { t } = useI18n();

async function run(action: () => Promise<void>) {
  busy.value = true;
  error.value = "";
  try {
    await action();
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || cause?.message || t("app.push.changeFailed");
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogOpen"
    :header="t('app.push.header')"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-3 text-sm leading-6 text-[var(--text-2)]">
      <div v-if="state === 'loading'" class="flex items-center gap-3">
        <PrimeProgressSpinner class="!h-5 !w-5" />
        <span>{{ t("app.push.checking") }}</span>
      </div>

      <template v-else-if="state === 'needs-install'">
        <p>
          {{ t("app.push.install.intro") }}
        </p>
        <ol class="list-decimal space-y-1 pl-5">
          <i18n-t keypath="app.push.install.share" tag="li">
            <template #share>
              <i class="pi pi-share-alt align-middle text-sm" aria-hidden="true"></i>
              <span class="sr-only">{{ t("app.push.install.shareLabel") }}</span>
            </template>
          </i18n-t>
          <li>{{ t("app.push.install.add") }}</li>
          <li>{{ t("app.push.install.open") }}</li>
        </ol>
      </template>

      <p v-else-if="state === 'unsupported'">
        {{ t("app.push.unsupported") }}
      </p>

      <p v-else-if="state === 'denied'">
        {{ t("app.push.denied") }}
      </p>

      <template v-else>
        <p>
          {{ t("app.push.intro") }}
        </p>
        <p
          v-if="state === 'on'"
          class="flex items-center gap-2 font-medium text-[var(--positive-ink)]"
        >
          <i class="pi pi-check" aria-hidden="true"></i>
          {{ t("app.push.active") }}
        </p>
      </template>

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">
        {{ error }}
      </small>
    </div>

    <template #footer>
      <PrimeButton :label="t('common.actions.close')" text @click="dialogOpen = false" />
      <PrimeButton
        v-if="state === 'off'"
        :label="t('common.actions.activate')"
        icon="pi pi-bell"
        class="min-h-11"
        :loading="busy"
        @click="run(enable)"
      />
      <PrimeButton
        v-else-if="state === 'on'"
        :label="t('app.push.disable')"
        icon="pi pi-bell-slash"
        severity="secondary"
        outlined
        class="min-h-11"
        :loading="busy"
        @click="run(disable)"
      />
    </template>
  </PrimeDialog>
</template>
