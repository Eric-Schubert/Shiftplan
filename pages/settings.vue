<script setup lang="ts">
const authStore = useAuthStore();

const activeTab = ref(authStore.isAdmin ? "0" : "2");
const showChangePasswordDialog = ref(false);

function extendSession() {
  authStore.extendSession();
}

watch(
  () => authStore.user?.role,
  () => {
    activeTab.value = authStore.isAdmin ? "0" : "2";
  }
);
</script>

<template>
  <div>
    <div v-if="authStore.isChecking" class="flex min-h-[60vh] items-center justify-center">
      <div class="planner-slab flex items-center gap-3 px-5 py-4 text-[var(--text-2)]">
        <PrimeProgressSpinner class="!h-6 !w-6" />
        <span class="text-sm font-semibold">Session wird geprüft.</span>
      </div>
    </div>

    <AdminLogin v-else-if="!authStore.isAuthenticated" />

    <div v-else-if="!authStore.canEditShifts" class="min-h-[60vh] flex items-center justify-center">
      <div class="planner-slab w-full max-w-md text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-ink)]">
          <i class="pi pi-exclamation-triangle text-3xl" aria-hidden="true"></i>
        </div>
        <h2 class="text-2xl font-semibold text-[var(--text-1)]">Kein Zugriff</h2>
        <p class="mx-auto mt-3 max-w-[28rem] text-sm leading-6 text-[var(--text-2)]">
          Dieser Bereich ist nur für Planer und Administratoren verfügbar.
        </p>
        <div class="mt-5 flex flex-col gap-2">
          <NuxtLink to="/">
            <PrimeButton
              label="Zum Schichtplan"
              icon="pi pi-arrow-left"
              severity="secondary"
              class="w-full min-h-11"
            />
          </NuxtLink>
          <PrimeButton
            label="Abmelden"
            icon="pi pi-sign-out"
            severity="secondary"
            outlined
            class="min-h-11"
            @click="authStore.logout()"
          />
        </div>
      </div>
    </div>

    <div v-else class="planner-shell" @click="extendSession" @keydown="extendSession">
      <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-1.5">
          <h2 class="planner-headline text-[var(--text-1)]">Einstellungen</h2>
          <p class="max-w-[50rem] text-sm text-[var(--text-2)]">
            <template v-if="authStore.isAdmin">
              Mitarbeiter, Schichten, Benutzer und Rotationsmuster werden hier zentral gepflegt.
            </template>
            <template v-else>
              Rotationsmuster können gepflegt und Schichtpläne aus Vorlagen erzeugt werden.
            </template>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="planner-chip">
            <i class="pi pi-user text-[0.7rem]" aria-hidden="true"></i>
            {{ authStore.username }}
          </span>
          <PrimeButton
            label="Passwort ändern"
            icon="pi pi-key"
            severity="secondary"
            size="small"
            outlined
            class="min-h-9"
            @click="showChangePasswordDialog = true"
          />
          <PrimeButton
            label="Abmelden"
            icon="pi pi-sign-out"
            severity="secondary"
            size="small"
            outlined
            class="min-h-9"
            @click="authStore.logout()"
          />
        </div>
      </header>

      <SettingsTabs v-model:active-tab="activeTab" />

      <ChangePasswordDialog v-model:visible="showChangePasswordDialog" />
    </div>
  </div>
</template>
