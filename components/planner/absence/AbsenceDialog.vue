<script setup lang="ts">
import { ABSENCE_REASON_LABELS, formatAbsenceDay, type AbsenceReason } from "~/types/absence";

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

function weekDates(year: number, week: number): string[] {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (week - 1) * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

const dayOptions = computed(() =>
  weekDates(props.year, props.week).map((date) => ({ label: formatAbsenceDay(date), value: date }))
);
const staffOptions = computed(() =>
  dataStore.activeStaff.map((staff) => ({ label: staff.name, value: staff.staff_id }))
);
const reasonOptions = (Object.keys(ABSENCE_REASON_LABELS) as AbsenceReason[]).map((reason) => ({
  label: ABSENCE_REASON_LABELS[reason],
  value: reason,
}));

const staffId = ref<number | null>(null);
const date = ref<string | null>(null);
const reason = ref<AbsenceReason>("krank");
const note = ref("");
const notifyTeam = ref(false);
const message = ref("");
const saving = ref(false);
const error = ref("");

async function save() {
  if (!staffId.value || !date.value) {
    error.value = "Bitte Mitarbeiter und Tag wählen";
    return;
  }

  saving.value = true;
  error.value = "";
  try {
    await authFetch("/api/absences", {
      method: "POST",
      body: {
        staffId: staffId.value,
        date: date.value,
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
          <label for="absence-day" class="block font-medium text-[var(--text-2)]">Tag (KW {{ week }})</label>
          <PrimeSelect
            v-model="date"
            input-id="absence-day"
            :options="dayOptions"
            option-label="label"
            option-value="value"
            placeholder="Tag"
            class="w-full"
          />
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
      </div>

      <div class="space-y-1.5">
        <label for="absence-note" class="block font-medium text-[var(--text-2)]">Notiz (optional)</label>
        <PrimeInputText id="absence-note" v-model="note" maxlength="200" class="w-full" />
        <p class="text-xs text-[var(--text-3)]">
          Grund und Notiz sehen nur Planer. Sie werden nach 90 Tagen gelöscht. Keine Diagnosen eintragen.
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
          <p class="text-xs text-[var(--text-3)]">Das Team sieht Name, Tag und Schicht, nie den Grund.</p>
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
