<script setup lang="ts">
import { PASSWORD_POLICY_HINT, validatePasswordStrength } from "~/utils/password-policy";

const { authFetch } = useAuthFetch();
const visible = defineModel<boolean>("visible");

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const error = ref("");
const success = ref(false);
const loading = ref(false);
const passwordErrorId = "change-password-error";

async function changePassword() {
  error.value = "";
  success.value = false;

  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    error.value = "Alle Felder ausfüllen";
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = "Neue Passwörter stimmen nicht überein";
    return;
  }

  const strength = validatePasswordStrength(newPassword.value);
  if (!strength.valid) {
    error.value = strength.message;
    return;
  }

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
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";

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
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
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
        class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--positive-soft)] px-4 py-5 text-center"
      >
        <Icon name="mdi:check-circle" class="mb-2 text-3xl text-[var(--positive-ink)]" />
        <p class="font-medium text-[var(--positive-ink)]">
          Passwort erfolgreich geändert.
        </p>
      </div>

      <template v-else>
        <div class="space-y-1.5">
          <label for="current-password" class="block text-sm font-medium text-[var(--text-2)]">
            Aktuelles Passwort
          </label>
          <PrimeInputText
            v-model="currentPassword"
            id="current-password"
            type="password"
            placeholder="Aktuelles Passwort eingeben"
            :aria-describedby="error ? passwordErrorId : undefined"
          />
        </div>

        <div class="space-y-1.5">
          <label for="new-password" class="block text-sm font-medium text-[var(--text-2)]">
            Neues Passwort
          </label>
          <PrimeInputText
            v-model="newPassword"
            id="new-password"
            type="password"
            :placeholder="PASSWORD_POLICY_HINT"
            :aria-describedby="error ? passwordErrorId : undefined"
          />
        </div>

        <div class="space-y-1.5">
          <label for="confirm-password" class="block text-sm font-medium text-[var(--text-2)]">
            Neues Passwort bestätigen
          </label>
          <PrimeInputText
            v-model="confirmPassword"
            id="confirm-password"
            type="password"
            placeholder="Neues Passwort wiederholen"
            :aria-describedby="error ? passwordErrorId : undefined"
          />
        </div>

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
