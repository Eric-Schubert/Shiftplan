<script setup lang="ts">
const authStore = useAuthStore();
const dataStore = useDataStore();

const activeTab = ref(0);
const showChangePasswordDialog = ref(false);

// Session bei Aktivität verlängern
function extendSession() {
  authStore.extendSession();
}
</script>

<template>
  <div>
    <!-- Nicht eingeloggt: Login-Formular anzeigen -->
    <AdminLogin v-if="!authStore.isAuthenticated" />

    <!-- Eingeloggt: Settings anzeigen -->
    <div v-else class="space-y-6" @click="extendSession" @keydown="extendSession">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            Einstellungen
          </h2>
          <p class="text-gray-500 dark:text-gray-400">
            Verwalte Mitarbeiter, Schichten und Rotationsmuster
          </p>
        </div>

        <div class="flex gap-2">
          <PrimeButton
            label="Passwort ändern"
            icon="pi pi-key"
            severity="secondary"
            size="small"
            @click="showChangePasswordDialog = true"
          />
          <PrimeButton
            label="Abmelden"
            icon="pi pi-sign-out"
            severity="secondary"
            size="small"
            outlined
            @click="authStore.logout()"
          />
        </div>
      </div>

      <PrimeTabView v-model:active-index="activeTab">
        <PrimeTabPanel header="Mitarbeiter">
          <div class="pt-4">
            <StaffManager />
          </div>
        </PrimeTabPanel>

        <PrimeTabPanel header="Schichten">
          <div class="pt-4">
            <ShiftManager />
          </div>
        </PrimeTabPanel>

        <PrimeTabPanel header="Rotationsmuster">
          <div class="pt-4">
            <RotationManager />
          </div>
        </PrimeTabPanel>
      </PrimeTabView>

      <!-- Passwort ändern Dialog -->
      <ChangePasswordDialog v-model:visible="showChangePasswordDialog" />
    </div>
  </div>
</template>
