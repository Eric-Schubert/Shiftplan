<script setup lang="ts">
const authStore = useAuthStore();

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleLogin() {
  if (!username.value) {
    error.value = "Bitte Benutzername eingeben";
    return;
  }
  if (!password.value) {
    error.value = "Bitte Passwort eingeben";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const result = await authStore.login(username.value, password.value);
    if (!result.success) {
      error.value = result.message || "Login fehlgeschlagen";
      password.value = "";
    }
  } catch {
    error.value = "Fehler beim Login";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-sm">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-primary-light/10 dark:bg-primary-dark/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="mdi:shield-lock" class="text-3xl text-primary-light dark:text-primary-dark" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">
          Anmelden
        </h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Bitte Zugangsdaten eingeben
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <PrimeInputText
            v-model="username"
            type="text"
            placeholder="Benutzername"
            class="w-full"
            :disabled="loading"
            autocomplete="username"
          />
        </div>

        <div>
          <PrimeInputText
            v-model="password"
            type="password"
            placeholder="Passwort"
            class="w-full"
            :class="{ 'p-invalid': error }"
            :disabled="loading"
            autocomplete="current-password"
          />
          <small v-if="error" class="text-red-500 block mt-1 text-center">
            {{ error }}
          </small>
        </div>

        <PrimeButton
          type="submit"
          label="Anmelden"
          icon="pi pi-lock-open"
          class="w-full"
          :loading="loading"
        />

        <div class="text-center">
          <NuxtLink to="/" class="text-sm text-gray-500 hover:text-primary-light dark:hover:text-primary-dark">
            ← Zurück zum Schichtplan
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>
