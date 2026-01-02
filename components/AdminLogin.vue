<script setup lang="ts">
const authStore = useAuthStore();

const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleLogin() {
  if (!password.value) {
    error.value = "Bitte Passwort eingeben";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const success = await authStore.login(password.value);
    if (!success) {
      error.value = "Falsches Passwort";
      password.value = "";
    }
  } catch {
    error.value = "Fehler beim Login";
  } finally {
    loading.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    handleLogin();
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
          Admin-Bereich
        </h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Bitte Admin-Passwort eingeben
        </p>
      </div>

      <div class="space-y-4">
        <div>
          <PrimeInputText
            v-model="password"
            type="password"
            placeholder="Passwort eingeben"
            class="w-full"
            :class="{ 'p-invalid': error }"
            @keydown="handleKeydown"
            autofocus
          />
          <small v-if="error" class="text-red-500 block mt-1 text-center">
            {{ error }}
          </small>
        </div>

        <PrimeButton
          label="Anmelden"
          icon="pi pi-lock-open"
          class="w-full"
          :loading="loading"
          @click="handleLogin"
        />

        <div class="text-center">
          <NuxtLink to="/" class="text-sm text-gray-500 hover:text-primary-light dark:hover:text-primary-dark">
            ← Zurück zum Schichtplan
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
