<script setup lang="ts">
const MAX_LENGTH = 240;

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const { authFetch } = useAuthFetch();
const message = ref("");
const subscriberCount = ref<number | null>(null);
const sending = ref(false);
const error = ref("");
const result = ref("");
const { t } = useI18n();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return;
    error.value = "";
    result.value = "";
    try {
      const status = await authFetch<{ subscriberCount: number }>("/api/push/status");
      subscriberCount.value = status.subscriberCount;
    } catch {
      subscriberCount.value = null;
    }
  },
  { immediate: true }
);

async function send() {
  if (!message.value.trim()) {
    error.value = t("planner.week.notify.empty");
    return;
  }

  sending.value = true;
  error.value = "";
  try {
    const response = await authFetch<{ sent: number; failed: number }>("/api/push/notify", {
      method: "POST",
      body: { message: message.value },
    });
    result.value = t("planner.week.notify.sent", response.sent);
    message.value = "";
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || t("planner.week.notify.failed");
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="t('planner.week.hero.notifyTeam')"
    modal
    :style="{ width: '30rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-3 text-sm text-[var(--text-2)]">
      <p v-if="subscriberCount !== null">
        <template v-if="subscriberCount === 0">
          {{ t("planner.week.notify.nobody") }}
        </template>
        <template v-else>
          {{ t("planner.week.notify.reach", subscriberCount) }}
        </template>
      </p>

      <div class="space-y-1.5">
        <label for="team-notify-message" class="block font-medium">{{ t("planner.week.notify.message") }}</label>
        <PrimeTextarea
          id="team-notify-message"
          v-model="message"
          rows="3"
          :maxlength="MAX_LENGTH"
          class="w-full"
          :placeholder="t('planner.week.notify.placeholder')"
          :disabled="sending"
        />
        <div class="flex justify-between gap-3 text-xs text-[var(--text-3)]">
          <span>{{ t("planner.week.notify.noHealthData") }}</span>
          <span class="tabular-nums">{{ message.length }}/{{ MAX_LENGTH }}</span>
        </div>
      </div>

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
      <p v-if="result" class="flex items-center gap-2 font-medium text-[var(--text-1)]" role="status">
        <i class="pi pi-check" aria-hidden="true"></i>
        {{ result }}
      </p>
    </div>

    <template #footer>
      <PrimeButton :label="t('common.actions.close')" text @click="dialogVisible = false" />
      <PrimeButton
        :label="t('planner.week.notify.send')"
        icon="pi pi-send"
        class="min-h-11"
        :loading="sending"
        :disabled="subscriberCount === 0"
        @click="send"
      />
    </template>
  </PrimeDialog>
</template>
