<script setup lang="ts">
const authStore = useAuthStore();

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const loginErrorId = "login-error";
const { t } = useI18n();

const { demoLogin } = useRuntimeConfig().public;
const hasDemoLogin = Boolean(demoLogin.username && demoLogin.password);

function fillDemoLogin() {
  username.value = demoLogin.username;
  password.value = demoLogin.password;
  error.value = "";
}

async function handleLogin() {
  if (!username.value) {
    error.value = t("settings.auth.login.usernameMissing");
    return;
  }
  if (!password.value) {
    error.value = t("settings.auth.login.passwordMissing");
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const result = await authStore.login(username.value, password.value);
    if (!result.success) {
      error.value = result.message || t("settings.auth.login.failed");
      password.value = "";
    }
  } catch {
    error.value = t("settings.auth.login.error");
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
        <h2 class="text-xl font-semibold text-[var(--text-1)]">{{ t("common.actions.signIn") }}</h2>
        <p class="mt-2 text-sm leading-6 text-[var(--text-2)]">
          {{ t("settings.auth.login.intro") }}
        </p>
      </div>

      <p
        v-if="authStore.sessionExpired"
        class="mb-5 rounded-xl border border-[var(--border-soft)] bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning-ink)]"
        role="status"
      >
        {{ t("settings.auth.login.sessionExpired") }}
      </p>

      <DemoLoginHint v-if="hasDemoLogin" :username="demoLogin.username" :password="demoLogin.password" :disabled="loading" @fill="fillDemoLogin" />

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div class="space-y-1.5">
          <label for="login-username" class="block text-sm font-medium text-[var(--text-2)]">
            {{ t("settings.auth.username") }}
          </label>
          <PrimeInputText
            v-model="username"
            id="login-username"
            type="text"
            :placeholder="t('settings.auth.login.usernamePlaceholder')"
            class="w-full"
            :disabled="loading"
            autocomplete="username"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
          />
        </div>

        <div class="space-y-1.5">
          <label for="login-password" class="block text-sm font-medium text-[var(--text-2)]">
            {{ t("settings.auth.password") }}
          </label>
          <PrimeInputText
            v-model="password"
            id="login-password"
            type="password"
            :placeholder="t('settings.auth.login.passwordPlaceholder')"
            class="w-full"
            :class="{ 'p-invalid': error }"
            :disabled="loading"
            autocomplete="current-password"
            :aria-describedby="error ? loginErrorId : undefined"
          />
          <small v-if="error" :id="loginErrorId" class="block mt-1 text-sm text-[var(--danger-ink)]" role="alert">
            {{ error }}
          </small>
        </div>

        <PrimeButton type="submit" :label="t('common.actions.signIn')" icon="pi pi-lock-open" class="w-full min-h-11" :loading="loading" />

        <div class="pt-2 text-center">
          <NuxtLink
            to="/"
            class="text-sm font-medium text-[var(--text-2)] underline decoration-transparent underline-offset-4 transition hover:text-[var(--accent-strong)] hover:decoration-current"
          >
            {{ t("app.layout.settings.back") }}
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>
