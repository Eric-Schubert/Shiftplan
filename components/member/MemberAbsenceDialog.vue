<script setup lang="ts">
import { ABSENCE_REASON_LABELS, type AbsenceReason } from "~/types/absence";

// Staff report their own absence; same options as in the app.
const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "created", result: { notified: boolean; takeovers: boolean }): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const reasonOptions = (Object.keys(ABSENCE_REASON_LABELS) as AbsenceReason[]).map((reason) => ({
  label: ABSENCE_REASON_LABELS[reason],
  value: reason,
}));

const today = todayISO();
const from = ref(today);
const to = ref(today);
const reason = ref<AbsenceReason>("urlaub");
const notifyTeam = ref(true);
const seekTakeover = ref(false);
const message = ref("");
const saving = ref(false);
const error = ref("");

watch(from, (value) => {
  if (to.value < value) to.value = value;
});
// Looking for a replacement only makes sense when the team hears about it.
watch(seekTakeover, (value) => {
  if (value) notifyTeam.value = true;
});
watch(notifyTeam, (value) => {
  if (!value) seekTakeover.value = false;
});

async function save() {
  saving.value = true;
  error.value = "";
  try {
    await $fetch("/api/member/absences", {
      method: "POST",
      body: {
        from: from.value,
        to: to.value,
        reason: reason.value,
        notifyTeam: notifyTeam.value,
        seekTakeover: seekTakeover.value,
        message: notifyTeam.value ? message.value || undefined : undefined,
      },
    });
    emit("created", { notified: notifyTeam.value, takeovers: seekTakeover.value });
    dialogVisible.value = false;
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Ausfall konnte nicht gemeldet werden";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Ausfall melden"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <form class="space-y-4 text-sm" @submit.prevent="save">
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label for="member-absence-from" class="block font-medium text-[var(--text-2)]">Von</label>
          <input id="member-absence-from" v-model="from" type="date" :min="today" required class="p-inputtext p-component w-full" />
        </div>
        <div class="space-y-1.5">
          <label for="member-absence-to" class="block font-medium text-[var(--text-2)]">Bis</label>
          <input id="member-absence-to" v-model="to" type="date" :min="from" required class="p-inputtext p-component w-full" />
        </div>
      </div>

      <div class="space-y-1.5">
        <label for="member-absence-reason" class="block font-medium text-[var(--text-2)]">Grund</label>
        <PrimeSelect
          v-model="reason"
          input-id="member-absence-reason"
          :options="reasonOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
        <p class="text-xs text-[var(--text-3)]">Den Grund sieht nur die Planung.</p>
      </div>

      <div class="space-y-3 rounded-lg border border-[var(--border-soft)] p-3">
        <label class="flex items-start gap-2">
          <PrimeCheckbox v-model="notifyTeam" binary input-id="member-absence-notify" class="mt-0.5" />
          <span>
            <span class="block font-medium text-[var(--text-1)]">Team benachrichtigen</span>
            <span class="text-xs text-[var(--text-3)]">Das Team sieht Name und Zeitraum, nie den Grund.</span>
          </span>
        </label>
        <label class="flex items-start gap-2">
          <PrimeCheckbox v-model="seekTakeover" binary input-id="member-absence-takeover" class="mt-0.5" />
          <span>
            <span class="block font-medium text-[var(--text-1)]">Übernahme suchen</span>
            <span class="text-xs text-[var(--text-3)]">Kolleginnen und Kollegen können deine Schichten an diesen Tagen übernehmen.</span>
          </span>
        </label>
        <PrimeInputText
          v-if="notifyTeam"
          v-model="message"
          maxlength="160"
          placeholder="Zusatztext (optional)"
          class="w-full"
        />
      </div>

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </form>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="dialogVisible = false" />
      <PrimeButton label="Ausfall melden" icon="pi pi-check" class="min-h-11" :loading="saving" @click="save" />
    </template>
  </PrimeDialog>
</template>
