<script setup lang="ts">
import { ABSENCE_REASON_KEYS, type AbsenceReason } from "~/types/absence";
import { datesOfISOWeek } from "~/shared/utils/week";

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
const authStore = useAuthStore();
const { authFetch } = useAuthFetch();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const staffOptions = computed(() =>
  dataStore.activeStaff.map((staff) => ({ label: staff.name, value: staff.staff_id }))
);
const { t } = useI18n();
const reasonOptions = computed(() =>
  (Object.keys(ABSENCE_REASON_KEYS) as AbsenceReason[]).map((reason) => ({ label: t(ABSENCE_REASON_KEYS[reason]), value: reason }))
);

const staffId = ref<number | null>(null);
const days = datesOfISOWeek(props.year, props.week);
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
    error.value = t("absence.dialog.missing");
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
    error.value = cause?.data?.statusMessage || t("absence.dialog.failed");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="t('absence.add')"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <form class="space-y-4 text-sm" @submit.prevent="save">
      <div class="space-y-1.5">
        <label for="absence-staff" class="block font-medium text-[var(--text-2)]">{{ t("absence.dialog.staff") }}</label>
        <PrimeSelect
          v-model="staffId"
          input-id="absence-staff"
          :options="staffOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('common.choose')"
          filter
          class="w-full"
        />
      </div>

      <DateRangeFields v-model:from="from" v-model:to="to" id-prefix="absence" />

      <div class="space-y-1.5">
        <label for="absence-reason" class="block font-medium text-[var(--text-2)]">{{ t("absence.reason") }}</label>
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
        <label for="absence-note" class="block font-medium text-[var(--text-2)]">{{ t("absence.dialog.note") }}</label>
        <PrimeInputText id="absence-note" v-model="note" maxlength="200" class="w-full" />
        <p class="text-xs text-[var(--text-3)]">
          {{ t("absence.dialog.privacy") }}
          {{ authStore.isAdmin ? t("absence.dialog.maxAdmin") : t("absence.dialog.maxPlanner") }}
        </p>
      </div>

      <AbsenceNotifyFields v-model:notify="notifyTeam" v-model:message="message" />

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </form>

    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="dialogVisible = false" />
      <PrimeButton :label="t('absence.dialog.submit')" icon="pi pi-check" class="min-h-11" :loading="saving" @click="save" />
    </template>
  </PrimeDialog>
</template>
