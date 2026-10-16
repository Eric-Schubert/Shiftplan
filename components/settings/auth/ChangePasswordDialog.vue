<script setup lang="ts">
import { passwordChangeProblem } from "~/utils/account-forms";

const { authFetch } = useAuthFetch();
const configStore = useConfigStore();
const visible = defineModel<boolean>("visible");

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const error = ref("");
const success = ref(false);
const loading = ref(false);
const passwordErrorId = "change-password-error";
const formId = "change-password-form";
const { t } = useI18n();
const passwordHint = computed(() => configStore.passwordPolicy.hint || t("settings.auth.passwordHint"));

function clearFields() {
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
}

async function changePassword() {
  const problem = passwordChangeProblem(currentPassword.value, newPassword.value, confirmPassword.value, configStore.passwordPolicy);
  error.value = problem ? t(problem.key, problem.params ?? {}) : "";
  success.value = false;
  if (problem) return;

  loading.value = true;

  try {
    await authFetch("/api/auth/change-password", {
      method: "POST",
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    });

    success.value = true;
    clearFields();

    setTimeout(() => {
      visible.value = false;
      success.value = false;
    }, 2000);
  } catch (requestError: any) {
    error.value = requestError.data?.message || t("settings.auth.changePassword.failed");
  } finally {
    loading.value = false;
  }
}

function onHide() {
  clearFields();
  error.value = "";
  success.value = false;
}
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    :header="t('app.settingsPage.changePassword')"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    @hide="onHide"
  >
    <form :id="formId" class="space-y-4" @submit.prevent="changePassword">
      <div v-if="success" class="rounded-xl border border-[var(--border-soft)] bg-[var(--positive-soft)] px-4 py-5 text-center">
        <i class="pi pi-check-circle mb-2 text-3xl text-[var(--positive-ink)]" aria-hidden="true"></i>
        <p class="font-medium text-[var(--positive-ink)]">
          {{ t("settings.auth.changePassword.done") }}
        </p>
      </div>

      <template v-else>
        <ChangePasswordField
          v-model="currentPassword"
          input-id="current-password"
          :label="t('settings.auth.changePassword.current')"
          :placeholder="t('settings.auth.changePassword.currentPlaceholder')"
          :described-by="error ? passwordErrorId : undefined"
        />
        <ChangePasswordField
          v-model="newPassword"
          input-id="new-password"
          :label="t('settings.auth.changePassword.new')"
          :placeholder="passwordHint"
          :described-by="error ? passwordErrorId : undefined"
        />
        <ChangePasswordField
          v-model="confirmPassword"
          input-id="confirm-password"
          :label="t('settings.auth.changePassword.repeat')"
          :placeholder="t('settings.auth.changePassword.repeatPlaceholder')"
          :described-by="error ? passwordErrorId : undefined"
        />

        <small v-if="error" :id="passwordErrorId" class="block text-sm text-[var(--danger-ink)]" role="alert">
          {{ error }}
        </small>
      </template>
    </form>

    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="visible = false" />
      <PrimeButton v-if="!success" type="submit" :form="formId" :label="t('app.settingsPage.changePassword')" class="min-h-11" :loading="loading" />
    </template>
  </PrimeDialog>
</template>
