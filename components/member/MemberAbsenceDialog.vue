<script setup lang="ts">
import { ABSENCE_REASON_KEYS, type AbsenceReason } from "~/types/absence";

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

const { t } = useI18n();

const requestError = useRequestError();
const reasonOptions = computed(() =>
  (Object.keys(ABSENCE_REASON_KEYS) as AbsenceReason[]).map((reason) => ({ label: t(ABSENCE_REASON_KEYS[reason]), value: reason }))
);

const appStore = useAppStore();
// Teams that open next week on Saturday do not work weekends; the server leaves those days out.
const weekdaysOnly = computed(() => appStore.nextWeekFromSaturday);
const today = todayISO();
const from = ref(weekdaysOnly.value ? nextWeekday(today) : today);
const to = ref(from.value);
const weekend = computed(() => (weekdaysOnly.value && from.value && to.value ? weekendShare(from.value, to.value) : "none"));
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
  if (weekend.value === "all") return;
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
  } catch (cause) {
    error.value = requestError(cause, "absence.member.failed");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" :header="t('absence.member.report')" modal :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }">
    <form class="space-y-4 text-sm" @submit.prevent="save">
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label for="member-absence-from" class="block font-medium text-[var(--text-2)]">{{ t("common.period.from") }}</label>
          <input id="member-absence-from" v-model="from" type="date" :min="today" required class="p-inputtext p-component w-full" />
        </div>
        <div class="space-y-1.5">
          <label for="member-absence-to" class="block font-medium text-[var(--text-2)]">{{ t("common.period.to") }}</label>
          <input id="member-absence-to" v-model="to" type="date" :min="from" required class="p-inputtext p-component w-full" />
        </div>
      </div>
      <p v-if="weekend === 'some'" class="text-xs text-[var(--text-3)]">{{ t("absence.member.weekendSome") }}</p>
      <p v-else-if="weekend === 'all'" class="text-xs font-medium text-[var(--warning-ink)]">
        {{ t("absence.member.weekendAll") }}
      </p>

      <div class="space-y-1.5">
        <label for="member-absence-reason" class="block font-medium text-[var(--text-2)]">{{ t("absence.reason") }}</label>
        <PrimeSelect
          v-model="reason"
          input-id="member-absence-reason"
          :options="reasonOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
        <p class="text-xs text-[var(--text-3)]">{{ t("absence.member.reasonHint") }}</p>
      </div>

      <div class="space-y-3 rounded-lg border border-[var(--border-soft)] p-3">
        <label class="flex items-start gap-2">
          <PrimeCheckbox v-model="notifyTeam" binary input-id="member-absence-notify" class="mt-0.5" />
          <span>
            <span class="block font-medium text-[var(--text-1)]">{{ t("absence.member.notify") }}</span>
            <span class="text-xs text-[var(--text-3)]">{{ t("absence.teamSeesHint") }}</span>
          </span>
        </label>
        <label class="flex items-start gap-2">
          <PrimeCheckbox v-model="seekTakeover" binary input-id="member-absence-takeover" class="mt-0.5" />
          <span>
            <span class="block font-medium text-[var(--text-1)]">{{ t("absence.member.seekTakeover") }}</span>
            <span class="text-xs text-[var(--text-3)]">{{ t("absence.member.seekTakeoverHint") }}</span>
          </span>
        </label>
        <PrimeInputText v-if="notifyTeam" v-model="message" maxlength="160" :placeholder="t('absence.member.message')" class="w-full" />
      </div>

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </form>

    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="dialogVisible = false" />
      <PrimeButton
        :label="t('absence.member.report')"
        icon="pi pi-check"
        class="min-h-11"
        :loading="saving"
        :disabled="weekend === 'all'"
        @click="save"
      />
    </template>
  </PrimeDialog>
</template>
