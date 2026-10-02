<script setup lang="ts">
const authStore = useAuthStore();

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const loginErrorId = "login-error";

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
    <div class="planner-slab w-full max-w-sm !p-6">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <i class="pi pi-lock text-lg" aria-hidden="true"></i>
        </div>
        <h2 class="text-xl font-semibold text-[var(--text-1)]">Anmelden</h2>
        <p class="mt-2 text-sm leading-6 text-[var(--text-2)]">
          Melde dich an, um Schichten, Muster und Benutzer zu verwalten.
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div class="space-y-1.5">
          <label for="login-username" class="block text-sm font-medium text-[var(--text-2)]">
            Benutzername
          </label>
          <PrimeInputText
            v-model="username"
            id="login-username"
            type="text"
            placeholder="z. B. schichtleitung"
            class="w-full"
            :disabled="loading"
            autocomplete="username"
          />
        </div>

        <div class="space-y-1.5">
          <label for="login-password" class="block text-sm font-medium text-[var(--text-2)]">
            Passwort
          </label>
          <PrimeInputText
            v-model="password"
            id="login-password"
            type="password"
            placeholder="Passwort eingeben"
            class="w-full"
            :class="{ 'p-invalid': error }"
            :disabled="loading"
            autocomplete="current-password"
            :aria-describedby="error ? loginErrorId : undefined"
          />
          <small
            v-if="error"
            :id="loginErrorId"
            class="block mt-1 text-sm text-[var(--danger-ink)]"
            role="alert"
          >
            {{ error }}
          </small>
        </div>

        <PrimeButton
          type="submit"
          label="Anmelden"
          icon="pi pi-lock-open"
          class="w-full min-h-11"
          :loading="loading"
        />

        <div class="pt-2 text-center">
          <NuxtLink
            to="/"
            class="text-sm font-medium text-[var(--text-2)] underline decoration-transparent underline-offset-4 transition hover:text-[var(--accent-strong)] hover:decoration-current"
          >
            Zurück zum Schichtplan
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>
