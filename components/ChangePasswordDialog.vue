<script setup lang="ts">
const { authFetch } = useAuthFetch();
const visible = defineModel<boolean>("visible");

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const error = ref("");
const success = ref(false);
const loading = ref(false);

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

  if (newPassword.value.length < 4) {
    error.value = "Passwort muss mindestens 4 Zeichen haben";
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
    
    // Dialog nach 2 Sekunden schließen
    setTimeout(() => {
      visible.value = false;
      success.value = false;
    }, 2000);
  } catch (e: any) {
    error.value = e.data?.message || "Passwort konnte nicht geändert werden";
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
    header="Admin-Passwort ändern"
    modal
    :style="{ width: '25rem' }"
    @hide="onHide"
  >
    <div class="space-y-4">
      <div v-if="success" class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
        <Icon name="mdi:check-circle" class="text-3xl text-green-500 mb-2" />
        <p class="text-green-700 dark:text-green-400 font-medium">
          Passwort erfolgreich geändert!
        </p>
      </div>

      <template v-else>
        <div class="flex flex-col gap-2">
          <label class="font-medium">Aktuelles Passwort</label>
          <PrimeInputText
            v-model="currentPassword"
            type="password"
            placeholder="Aktuelles Passwort eingeben"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="font-medium">Neues Passwort</label>
          <PrimeInputText
            v-model="newPassword"
            type="password"
            placeholder="Neues Passwort eingeben"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="font-medium">Neues Passwort bestätigen</label>
          <PrimeInputText
            v-model="confirmPassword"
            type="password"
            placeholder="Neues Passwort wiederholen"
          />
        </div>

        <small v-if="error" class="text-red-500 block">
          {{ error }}
        </small>
      </template>
    </div>

    <template #footer>
      <PrimeButton
        label="Abbrechen"
        text
        @click="visible = false"
      />
      <PrimeButton
        v-if="!success"
        label="Passwort ändern"
        :loading="loading"
        @click="changePassword"
      />
    </template>
  </PrimeDialog>
</template>
