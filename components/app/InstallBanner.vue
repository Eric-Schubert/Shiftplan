<script setup lang="ts">



const { isVisible, isInstallable, isIOS, init, install, dismiss } = useInstallPrompt()

onMounted(() => {
  init()
})
</script>

<template>
  <Transition name="install-banner">
    <div
      v-if="isVisible"
      class="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4"
    >
      <div
        class="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-3 px-4 py-3"
      >

        <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
          <i class="pi pi-download text-xl text-indigo-600 dark:text-indigo-400" aria-hidden="true"></i>
        </div>


        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
            Zum Homescreen hinzufügen
          </p>

          <p v-if="isIOS" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tippe auf
            <i class="pi pi-share-alt inline text-sm align-middle" aria-hidden="true"></i>
            und dann „Zum Home-Bildschirm"
          </p>

          <p v-else class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Als App installieren – schneller Zugriff ohne Browser
          </p>
        </div>


        <div class="flex items-center gap-2 flex-shrink-0">

          <PrimeButton
            v-if="isInstallable"
            label="Installieren"
            icon="pi pi-download"
            class="min-h-11"
            @click="install"
          />


          <PrimeButton
            text
            rounded
            icon="pi pi-times"
            class="!h-11 !w-11"
            severity="secondary"
            aria-label="Hinweis ausblenden"
            title="Nicht mehr anzeigen"
            @click="dismiss"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.install-banner-enter-active,
.install-banner-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.install-banner-enter-from,
.install-banner-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
