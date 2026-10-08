<script setup lang="ts">
// Changing or removing the code affects every device of the team, so it needs a confirmation.
const props = defineProps<{ removing: boolean; saving: boolean }>();
const emit = defineEmits<{ (e: "confirm"): void }>();
const visible = defineModel<boolean>("visible", { required: true });

const confirmText = computed(() =>
  props.removing
    ? "Der Schichtplan ist danach wieder für alle mit dem Link lesbar. Bestehende Benachrichtigungen bleiben aktiv."
    : "Alle Geräte mit dem alten Code werden abgemeldet und ihre Benachrichtigungen gelöscht. Das Team muss den neuen Code einmal eingeben und Benachrichtigungen erneut aktivieren."
);
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    :header="removing ? 'Zugangscode entfernen' : 'Zugangscode ändern'"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p class="text-sm leading-6">{{ confirmText }}</p>
    <template #footer>
      <PrimeButton label="Abbrechen" text @click="visible = false" />
      <PrimeButton
        :label="removing ? 'Entfernen' : 'Code ändern'"
        :severity="removing ? 'danger' : undefined"
        class="min-h-11"
        :loading="saving"
        @click="emit('confirm')"
      />
    </template>
  </PrimeDialog>
</template>
