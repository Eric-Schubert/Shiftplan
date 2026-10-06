<script setup lang="ts">
const { state, dialogOpen, enable, disable } = usePushNotifications();
const busy = ref(false);
const error = ref("");

async function run(action: () => Promise<void>) {
  busy.value = true;
  error.value = "";
  try {
    await action();
  } catch (cause: any) {
    error.value =
      cause?.data?.statusMessage || cause?.message || "Benachrichtigungen konnten nicht geändert werden";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogOpen"
    header="Benachrichtigungen"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-3 text-sm leading-6 text-[var(--text-2)]">
      <div v-if="state === 'loading'" class="flex items-center gap-3">
        <PrimeProgressSpinner class="!h-5 !w-5" />
        <span>Status wird geprüft.</span>
      </div>

      <template v-else-if="state === 'needs-install'">
        <p>
          Auf dem iPhone kommen Benachrichtigungen nur an, wenn der Schichtplan als App auf dem
          Home-Bildschirm liegt (ab iOS 16.4).
        </p>
        <ol class="list-decimal space-y-1 pl-5">
          <li>
            In Safari auf
            <i class="pi pi-share-alt align-middle text-sm" aria-hidden="true"></i>
            <span class="sr-only">Teilen</span>
            tippen.
          </li>
          <li>„Zum Home-Bildschirm“ wählen.</li>
          <li>Den Schichtplan vom Home-Bildschirm öffnen und dort auf die Glocke tippen.</li>
        </ol>
      </template>

      <p v-else-if="state === 'unsupported'">
        Dieser Browser unterstützt keine Push-Benachrichtigungen. Nutze zum Beispiel Chrome, Edge,
        Firefox oder Safari.
      </p>

      <p v-else-if="state === 'denied'">
        Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in den Einstellungen des
        Browsers (iPhone: Einstellungen → Mitteilungen → Schichtplan) und lade die Seite neu.
      </p>

      <template v-else>
        <p>
          Du bekommst eine Nachricht, wenn sich Schichten in dieser oder der nächsten Woche ändern
          oder die Planung das Team direkt anschreibt.
        </p>
        <p
          v-if="state === 'on'"
          class="flex items-center gap-2 font-medium text-[var(--positive-ink)]"
        >
          <i class="pi pi-check" aria-hidden="true"></i>
          Auf diesem Gerät aktiv.
        </p>
      </template>

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">
        {{ error }}
      </small>
    </div>

    <template #footer>
      <PrimeButton label="Schließen" text @click="dialogOpen = false" />
      <PrimeButton
        v-if="state === 'off'"
        label="Aktivieren"
        icon="pi pi-bell"
        class="min-h-11"
        :loading="busy"
        @click="run(enable)"
      />
      <PrimeButton
        v-else-if="state === 'on'"
        label="Ausschalten"
        icon="pi pi-bell-slash"
        severity="secondary"
        outlined
        class="min-h-11"
        :loading="busy"
        @click="run(disable)"
      />
    </template>
  </PrimeDialog>
</template>
