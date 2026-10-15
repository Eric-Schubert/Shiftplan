<script setup lang="ts">
// Setting, changing or removing the code affects every device of the team, so it needs a confirmation.
const props = defineProps<{ removing: boolean; firstCode: boolean; saving: boolean }>();
const emit = defineEmits<{ (e: "confirm"): void }>();
const visible = defineModel<boolean>("visible", { required: true });

const KEEPS_PERSONAL = "Persönliche Zugänge bleiben angemeldet und behalten ihre Benachrichtigungen.";

const confirmText = computed(() => {
  if (props.removing) {
    return "Der Schichtplan ist danach wieder für alle mit dem Link lesbar. Bestehende Benachrichtigungen bleiben aktiv.";
  }
  if (props.firstCode) {
    return `Benachrichtigungen, die ohne persönlichen Zugang aktiviert wurden, werden gelöscht. Das Team gibt den Code einmal ein und aktiviert sie erneut. ${KEEPS_PERSONAL}`;
  }
  return `Alle Geräte mit dem alten Code werden abgemeldet und ihre Benachrichtigungen gelöscht. Das Team muss den neuen Code einmal eingeben und Benachrichtigungen erneut aktivieren. ${KEEPS_PERSONAL}`;
});
const header = computed(() =>
  props.removing ? "Zugangscode entfernen" : props.firstCode ? "Zugangscode setzen" : "Zugangscode ändern"
);
const confirmLabel = computed(() => (props.removing ? "Entfernen" : props.firstCode ? "Code setzen" : "Code ändern"));
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    :header="header"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p class="text-sm leading-6">{{ confirmText }}</p>
    <template #footer>
      <PrimeButton label="Abbrechen" text @click="visible = false" />
      <PrimeButton
        :label="confirmLabel"
        :severity="removing ? 'danger' : undefined"
        class="min-h-11"
        :loading="saving"
        @click="emit('confirm')"
      />
    </template>
  </PrimeDialog>
</template>
