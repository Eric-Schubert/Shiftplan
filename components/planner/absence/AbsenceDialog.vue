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

// The range never runs backwards.
watch(from, (value) => {
  if (to.value < value) to.value = value;
});
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

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label for="absence-from" class="block font-medium text-[var(--text-2)]">Von</label>
          <input id="absence-from" v-model="from" type="date" required class="p-inputtext p-component w-full" />
        </div>
        <div class="space-y-1.5">
          <label for="absence-to" class="block font-medium text-[var(--text-2)]">Bis</label>
          <input id="absence-to" v-model="to" type="date" :min="from" required class="p-inputtext p-component w-full" />
        </div>
      </div>

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

      <div class="space-y-2 rounded-lg border border-[var(--border-soft)] p-3">
        <label class="flex items-center gap-2 font-medium text-[var(--text-1)]">
          <PrimeCheckbox v-model="notifyTeam" binary input-id="absence-notify" />
          Team per Push informieren
        </label>
        <template v-if="notifyTeam">
          <PrimeInputText
            v-model="message"
            maxlength="160"
            placeholder="Zusatztext, z. B. Wer kann übernehmen?"
            class="w-full"
          />
          <p class="text-xs text-[var(--text-3)]">Das Team sieht Name und Zeitraum, nie den Grund.</p>
        </template>
      </div>

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </form>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="dialogVisible = false" />
      <PrimeButton label="Eintragen" icon="pi pi-check" class="min-h-11" :loading="saving" @click="save" />
    </template>
  </PrimeDialog>
</template>
