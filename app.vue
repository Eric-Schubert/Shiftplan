<script setup lang="ts">
const showChangelogDialog = useState<boolean>("showChangelogDialog", () => false);
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <LazyChangelogBanner v-if="showChangelogDialog" />
</template>
