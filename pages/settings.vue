<script setup lang="ts">
const activeTab = ref(0);
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
        Einstellungen
      </h2>
      <p class="text-gray-500 dark:text-gray-400">
        Verwalte Mitarbeiter und Schichten
      </p>
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
    </PrimeTabView>
  </div>
</template>
