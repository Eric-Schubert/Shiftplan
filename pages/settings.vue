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
      <section class="planner-slab">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-3">
            <p class="planner-kicker">Administration</p>
            <div>
              <h2 class="text-2xl font-semibold text-[var(--text-1)] sm:text-3xl">Einstellungen</h2>
              <p class="mt-2 max-w-[50rem] text-sm leading-6 text-[var(--text-2)]">
                <template v-if="authStore.isAdmin">
                  Mitarbeiter, Schichten, Benutzer und Rotationsmuster werden hier zentral gepflegt.
                </template>
                <template v-else>
                  Rotationsmuster können gepflegt und Schichtpläne aus Vorlagen erzeugt werden.
                </template>
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="planner-chip planner-chip--muted">{{ authStore.username }}</span>
            <PrimeButton
              label="Passwort ändern"
              icon="pi pi-key"
              severity="secondary"
              class="min-h-11 !rounded-full"
              @click="showChangePasswordDialog = true"
            />
            <PrimeButton
              label="Abmelden"
              icon="pi pi-sign-out"
              severity="secondary"
              outlined
              class="min-h-11 !rounded-full"
              @click="authStore.logout()"
            />
          </div>
        </div>
      </section>

      <section class="planner-slab !p-0 max-w-full overflow-hidden">
        <PrimeTabs v-model:value="activeTab" class="max-w-full">
          <PrimeTabList class="max-w-full overflow-x-auto border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-2 py-2">
            <PrimeTab v-if="authStore.isAdmin" value="0" class="whitespace-nowrap">Mitarbeiter</PrimeTab>
            <PrimeTab v-if="authStore.isAdmin" value="1" class="whitespace-nowrap">Schichten</PrimeTab>
            <PrimeTab value="2" class="whitespace-nowrap">Rotationsmuster</PrimeTab>
            <PrimeTab v-if="authStore.isAdmin" value="3" class="whitespace-nowrap">Benutzer</PrimeTab>
            <PrimeTab v-if="authStore.isAdmin" value="5" class="whitespace-nowrap">Besuche</PrimeTab>
            <PrimeTab v-if="authStore.isAdmin" value="6" class="whitespace-nowrap">Kontakt</PrimeTab>
            <PrimeTab v-if="authStore.isAdmin" value="4" class="whitespace-nowrap">Änderungslog</PrimeTab>
          </PrimeTabList>

          <PrimeTabPanels class="min-w-0 max-w-full p-4 sm:p-5">
            <PrimeTabPanel v-if="authStore.isAdmin" value="0">
              <StaffManager />
            </PrimeTabPanel>

            <PrimeTabPanel v-if="authStore.isAdmin" value="1">
              <ShiftManager />
            </PrimeTabPanel>

            <PrimeTabPanel value="2">
              <RotationManager />
            </PrimeTabPanel>

            <PrimeTabPanel v-if="authStore.isAdmin" value="3">
              <UserManager />
            </PrimeTabPanel>

            <PrimeTabPanel v-if="authStore.isAdmin" value="5">
              <VisitAnalytics />
            </PrimeTabPanel>

            <PrimeTabPanel v-if="authStore.isAdmin" value="6">
              <ContactMessages />
            </PrimeTabPanel>

            <PrimeTabPanel v-if="authStore.isAdmin" value="4">
              <AuditLog />
            </PrimeTabPanel>
          </PrimeTabPanels>
        </PrimeTabs>
      </section>

      <ChangePasswordDialog v-model:visible="showChangePasswordDialog" />
    </div>
  </div>
</template>
