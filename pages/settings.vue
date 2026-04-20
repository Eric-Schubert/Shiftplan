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
    <!-- Nicht eingeloggt: Login-Formular anzeigen -->
    <AdminLogin v-if="!authStore.isAuthenticated" />

    <!-- Eingeloggt aber ohne Planungsrechte: Zugriff verweigert -->
    <div v-else-if="!authStore.canEditShifts" class="min-h-[60vh] flex items-center justify-center">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-sm text-center">
        <div class="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="mdi:shield-alert" class="text-3xl text-yellow-600 dark:text-yellow-400" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Kein Zugriff
        </h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">
          Dieser Bereich ist nur fuer Planer und Administratoren verfuegbar.
        </p>
        <div class="flex flex-col gap-2">
          <NuxtLink to="/">
            <PrimeButton
              label="Zum Schichtplan"
              icon="pi pi-arrow-left"
              severity="secondary"
              class="w-full"
            />
          </NuxtLink>
          <PrimeButton
            label="Abmelden"
            icon="pi pi-sign-out"
            severity="secondary"
            outlined
            size="small"
            @click="authStore.logout()"
          />
        </div>
      </div>
    </div>

    <!-- Admin/Planer: Settings anzeigen -->
    <div v-else class="space-y-6" @click="extendSession" @keydown="extendSession">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            Einstellungen
          </h2>
          <p class="text-gray-500 dark:text-gray-400">
            <template v-if="authStore.isAdmin">
              Verwalte Mitarbeiter, Schichten, Benutzer und Rotationsmuster
            </template>
            <template v-else>
              Pflege Rotationsmuster und erstelle Schichtplaene aus Vorlagen
            </template>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400 dark:text-gray-500">
            {{ authStore.username }}
          </span>
          <PrimeButton
            label="Passwort aendern"
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

      <PrimeTabs v-model:value="activeTab">
        <PrimeTabList>
          <PrimeTab v-if="authStore.isAdmin" value="0">Mitarbeiter</PrimeTab>
          <PrimeTab v-if="authStore.isAdmin" value="1">Schichten</PrimeTab>
          <PrimeTab value="2">Rotationsmuster</PrimeTab>
          <PrimeTab v-if="authStore.isAdmin" value="3">Benutzer</PrimeTab>
          <PrimeTab v-if="authStore.isAdmin" value="4">Aenderungslog</PrimeTab>
        </PrimeTabList>

        <PrimeTabPanels>
          <PrimeTabPanel v-if="authStore.isAdmin" value="0">
            <div class="pt-4">
              <StaffManager />
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel v-if="authStore.isAdmin" value="1">
            <div class="pt-4">
              <ShiftManager />
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="2">
            <div class="pt-4">
              <RotationManager />
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel v-if="authStore.isAdmin" value="3">
            <div class="pt-4">
              <UserManager />
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel v-if="authStore.isAdmin" value="4">
            <div class="pt-4">
              <AuditLog />
            </div>
          </PrimeTabPanel>
        </PrimeTabPanels>
      </PrimeTabs>

      <ChangePasswordDialog v-model:visible="showChangePasswordDialog" />
    </div>
  </div>
</template>
