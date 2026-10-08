<script setup lang="ts">
import { PASSWORD_POLICY_HINT } from "~/utils/password-policy";
import { passwordChangeProblem } from "~/utils/account-forms";

const { authFetch } = useAuthFetch();
const visible = defineModel<boolean>("visible");

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const error = ref("");
const success = ref(false);
const loading = ref(false);
const passwordErrorId = "change-password-error";

function clearFields() {
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
}

async function changePassword() {
  const problem = passwordChangeProblem(currentPassword.value, newPassword.value, confirmPassword.value);
  error.value = problem ?? "";
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
    error.value = requestError.data?.message || "Passwort konnte nicht geändert werden";
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
    header="Passwort ändern"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    @hide="onHide"
  >
    <div class="space-y-4">
      <div
        v-if="success"
        class="rounded-xl border border-[var(--border-soft)] bg-[var(--positive-soft)] px-4 py-5 text-center"
      >
        <i class="pi pi-check-circle mb-2 text-3xl text-[var(--positive-ink)]" aria-hidden="true"></i>
        <p class="font-medium text-[var(--positive-ink)]">
          Passwort erfolgreich geändert.
        </p>
      </div>

      <template v-else>
        <ChangePasswordField
          v-model="currentPassword"
          input-id="current-password"
          label="Aktuelles Passwort"
          placeholder="Aktuelles Passwort eingeben"
          :described-by="error ? passwordErrorId : undefined"
        />
        <ChangePasswordField
          v-model="newPassword"
          input-id="new-password"
          label="Neues Passwort"
          :placeholder="PASSWORD_POLICY_HINT"
          :described-by="error ? passwordErrorId : undefined"
        />
        <ChangePasswordField
          v-model="confirmPassword"
          input-id="confirm-password"
          label="Neues Passwort bestätigen"
          placeholder="Neues Passwort wiederholen"
          :described-by="error ? passwordErrorId : undefined"
        />

        <small
          v-if="error"
          :id="passwordErrorId"
          class="block text-sm text-[var(--danger-ink)]"
          role="alert"
        >
          {{ error }}
        </small>
      </template>
    </div>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="visible = false" />
      <PrimeButton
        v-if="!success"
        label="Passwort ändern"
        class="min-h-11"
        :loading="loading"
        @click="changePassword"
      />
    </template>
  </PrimeDialog>
</template>
