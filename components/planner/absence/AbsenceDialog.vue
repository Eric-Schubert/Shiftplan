<script setup lang="ts">
import { ABSENCE_REASON_LABELS, type AbsenceReason } from "~/types/absence";

const props = defineProps<{
  visible: boolean;
  year: number;
  week: number;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "created"): void;
}>();

const dataStore = useDataStore();
const { authFetch } = useAuthFetch();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const staffOptions = computed(() =>
  dataStore.activeStaff.map((staff) => ({ label: staff.name, value: staff.staff_id }))
);
const reasonOptions = (Object.keys(ABSENCE_REASON_LABELS) as AbsenceReason[]).map((reason) => ({
  label: ABSENCE_REASON_LABELS[reason],
  value: reason,
}));

const staffId = ref<number | null>(null);
const days = weekDates(props.year, props.week);
const from = ref(days[0]!);
const to = ref(days[0]!);
const reason = ref<AbsenceReason>("urlaub");
const note = ref("");
const notifyTeam = ref(false);
const message = ref("");
const saving = ref(false);
const error = ref("");

async function save() {
  if (!staffId.value || !from.value || !to.value) {
    error.value = "Bitte Mitarbeiter und Zeitraum wählen";
    return;
  }

  saving.value = true;
  error.value = "";
  try {
    await authFetch("/api/absences", {
      method: "POST",
      body: {
        staffId: staffId.value,
        from: from.value,
        to: to.value,
        reason: reason.value,
        note: note.value || undefined,
        notifyTeam: notifyTeam.value,
        message: notifyTeam.value ? message.value || undefined : undefined,
      },
    });
    emit("created");
    dialogVisible.value = false;
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Ausfall konnte nicht gespeichert werden";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Ausfall eintragen"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <form class="space-y-4 text-sm" @submit.prevent="save">
      <div class="space-y-1.5">
        <label for="absence-staff" class="block font-medium text-[var(--text-2)]">Mitarbeiter</label>
        <PrimeSelect
          v-model="staffId"
          input-id="absence-staff"
          :options="staffOptions"
          option-label="label"
          option-value="value"
          placeholder="Bitte wählen"
          filter
          class="w-full"
        />
      </div>

      <DateRangeFields v-model:from="from" v-model:to="to" id-prefix="absence" />

      <div class="space-y-1.5">
        <label for="absence-reason" class="block font-medium text-[var(--text-2)]">Grund</label>
        <PrimeSelect
          v-model="reason"
          input-id="absence-reason"
          :options="reasonOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>

      <div class="space-y-1.5">
        <label for="absence-note" class="block font-medium text-[var(--text-2)]">Notiz (optional)</label>
        <PrimeInputText id="absence-note" v-model="note" maxlength="200" class="w-full" />
        <p class="text-xs text-[var(--text-3)]">
          Grund und Notiz sehen nur Planer. Sie werden nach 90 Tagen gelöscht. Höchstens 8 Wochen am Stück.
        </p>
      </div>

      <AbsenceNotifyFields v-model:notify="notifyTeam" v-model:message="message" />

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </form>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="dialogVisible = false" />
      <PrimeButton label="Eintragen" icon="pi pi-check" class="min-h-11" :loading="saving" @click="save" />
    </template>
  </PrimeDialog>
</template>
