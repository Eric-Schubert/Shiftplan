<script setup lang="ts">
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";
import { SWAP_MAX_DAYS } from "~/shared/utils/limits";

// New takeover (give away one shift on one day) or swap (all shifts with someone for a period).
const props = defineProps<{ visible: boolean; staffId: number }>();
const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "created"): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const { data: shifts } = await useFetch<Shift[]>("/api/shift", { default: () => [] });
const { data: staff } = await useFetch<Staff[]>("/api/staff", { default: () => [] });

const { t } = useI18n();
const shiftOptions = computed(() => [
  { label: t("requests.dialog.myShift"), value: null },
  ...(shifts.value ?? []).filter((shift) => shift.active).map((shift) => ({ label: shift.name, value: shift.shift_id })),
]);
const partnerOptions = computed(() =>
  (staff.value ?? [])
    .filter((person) => person.active && person.staff_id !== props.staffId)
    .map((person) => ({ label: person.name, value: person.staff_id }))
);

const today = todayISO();
const kind = ref<"takeover" | "swap">("takeover");
const date = ref(today);
const shiftId = ref<number | null>(null);
const partnerId = ref<number | null>(null);
const from = ref(today);
const to = ref(today);
const message = ref("");
// Teams without weekend shifts swap Monday to Friday only; the server leaves Saturday and Sunday out.
const appStore = useAppStore();
const swapsWeekend = computed(() => appStore.nextWeekFromSaturday && weekendShare(from.value, to.value) !== "none");
const saving = ref(false);
const error = ref("");

async function save() {
  if (kind.value === "swap" && !partnerId.value) {
    error.value = t("requests.dialog.choosePartner");
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    await $fetch("/api/member/requests", {
      method: "POST",
      body:
        kind.value === "takeover"
          ? { kind: "takeover", date: date.value, shiftId: shiftId.value ?? undefined, message: message.value || undefined }
          : { kind: "swap", partnerStaffId: partnerId.value, from: from.value, to: to.value, message: message.value || undefined },
    });
    emit("created");
    dialogVisible.value = false;
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || t("requests.dialog.failed");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="t('requests.dialog.header')"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <form class="space-y-4 text-sm" @submit.prevent="save">
      <MemberRequestKindSwitch v-model="kind" />

      <template v-if="kind === 'takeover'">
        <p class="text-[var(--text-2)]">{{ t("requests.dialog.takeoverIntro") }}</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label for="request-date" class="block font-medium text-[var(--text-2)]">{{ t("requests.dialog.day") }}</label>
            <input id="request-date" v-model="date" type="date" :min="today" required class="p-inputtext p-component w-full" />
          </div>
          <div class="space-y-1.5">
            <label for="request-shift" class="block font-medium text-[var(--text-2)]">{{ t("requests.dialog.shift") }}</label>
            <PrimeSelect
              v-model="shiftId"
              input-id="request-shift"
              :options="shiftOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <p class="text-[var(--text-2)]">{{ t("requests.dialog.swapIntro") }}</p>
        <div class="space-y-1.5">
          <label for="request-partner" class="block font-medium text-[var(--text-2)]">{{ t("requests.dialog.partner") }}</label>
          <PrimeSelect
            v-model="partnerId"
            input-id="request-partner"
            :options="partnerOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('common.choose')"
            filter
            class="w-full"
          />
        </div>
        <DateRangeFields v-model:from="from" v-model:to="to" id-prefix="request" :min="today" />
        <p class="text-xs text-[var(--text-3)]">
          {{ t("common.maxWeeks", { weeks: SWAP_MAX_DAYS / 7 }) }}<template v-if="swapsWeekend">{{ " " + t("requests.dialog.noWeekend") }}</template>
        </p>
      </template>

      <PrimeInputText v-model="message" maxlength="160" :placeholder="t('requests.dialog.message')" class="w-full" />
      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </form>

    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="dialogVisible = false" />
      <PrimeButton :label="t('requests.dialog.send')" icon="pi pi-send" class="min-h-11" :loading="saving" @click="save" />
    </template>
  </PrimeDialog>
</template>
