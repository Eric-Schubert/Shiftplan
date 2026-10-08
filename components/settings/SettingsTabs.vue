<script setup lang="ts">
const authStore = useAuthStore();

const activeTab = defineModel<string>("activeTab", { required: true });
</script>

<template>
  <section class="planner-slab !p-0 max-w-full overflow-hidden">
    <PrimeTabs v-model:value="activeTab" class="max-w-full">
      <PrimeTabList class="max-w-full overflow-x-auto border-b border-[var(--border-soft)] px-2">
        <PrimeTab v-if="authStore.isAdmin" value="0" class="whitespace-nowrap">Mitarbeiter</PrimeTab>
        <PrimeTab v-if="authStore.isAdmin" value="1" class="whitespace-nowrap">Schichten</PrimeTab>
        <PrimeTab value="2" class="whitespace-nowrap">Rotationsmuster</PrimeTab>
        <PrimeTab v-if="authStore.isAdmin" value="3" class="whitespace-nowrap">Benutzer</PrimeTab>
        <PrimeTab value="8" class="whitespace-nowrap">App-Zugänge</PrimeTab>
        <PrimeTab value="9" class="whitespace-nowrap">Anfragen</PrimeTab>
        <PrimeTab v-if="authStore.isAdmin" value="7" class="whitespace-nowrap">Team-Zugang</PrimeTab>
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

        <PrimeTabPanel value="8">
          <MemberAccessManager />
        </PrimeTabPanel>

        <PrimeTabPanel value="9">
          <ShiftRequestManager />
        </PrimeTabPanel>

        <PrimeTabPanel v-if="authStore.isAdmin" value="7">
          <TeamAccessManager />
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
</template>
