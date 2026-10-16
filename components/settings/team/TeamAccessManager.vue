<script setup lang="ts">
type TeamAccess = {
  code: string | null;
  instanceName: string;
  nextWeekFromSaturday: boolean;
  subscriberCount: number;
};
type PendingAction = "generate" | "custom" | "remove";

const { authFetch } = useAuthFetch();
const access = ref<TeamAccess | null>(null);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const customCode = ref("");
const pendingAction = ref<PendingAction | null>(null);
const instanceName = ref("");
const nextWeekFromSaturday = ref(true);
const { t } = useI18n();

const confirmVisible = computed({
  get: () => pendingAction.value !== null,
  set: (value: boolean) => {
    if (!value) pendingAction.value = null;
  },
});

async function load() {
  loading.value = true;
  try {
    access.value = await authFetch<TeamAccess>("/api/team-access");
    instanceName.value = access.value.instanceName;
    nextWeekFromSaturday.value = access.value.nextWeekFromSaturday;
  } finally {
    loading.value = false;
  }
}

function requestChange(action: PendingAction) {
  error.value = "";
  // The first code only drops pushes enabled without a personal sign-in; with none there is nothing to confirm.
  if (!access.value?.code && action !== "remove" && !access.value?.subscriberCount) {
    void applyChange(action);
    return;
  }
  pendingAction.value = action;
}

async function applyChange(action: PendingAction) {
  saving.value = true;
  error.value = "";
  try {
    const body =
      action === "generate" ? { generate: true } : { code: action === "remove" ? null : customCode.value };
    await authFetch("/api/team-access", {
      method: "POST",
      body,
    });
    customCode.value = "";
    pendingAction.value = null;
    await load();
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || t("settings.team.saveFailed");
    pendingAction.value = null;
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <p class="max-w-[46rem] text-sm leading-6 text-[var(--text-2)]">{{ t("settings.team.intro") }}</p>

    <div v-if="loading && !access" class="flex items-center gap-3 text-sm text-[var(--text-2)]">
      <PrimeProgressSpinner class="!h-5 !w-5" />
      {{ t("settings.loading") }}
    </div>

    <template v-else-if="access">
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="planner-chip">
          <i :class="access.code ? 'pi pi-lock' : 'pi pi-lock-open'" class="text-[0.7rem]" aria-hidden="true"></i>
          {{ access.code ? t("settings.team.codeActive") : t("settings.team.public") }}
        </span>
        <span class="planner-chip">
          <i class="pi pi-bell text-[0.7rem]" aria-hidden="true"></i>
          {{ t("settings.team.subscribers", access.subscriberCount) }}
        </span>
      </div>

      <TeamAccessCodeCard
        v-if="access.code"
        :code="access.code"
        :generating="saving && pendingAction === 'generate'"
        @generate="requestChange('generate')"
        @remove="requestChange('remove')"
        @error="error = $event"
      />
      <PrimeButton
        v-else
        :label="t('settings.team.setUp')"
        icon="pi pi-lock"
        class="min-h-11"
        :loading="saving"
        @click="requestChange('generate')"
      />

      <TeamAccessCustomCodeForm v-model:code="customCode" :saving="saving" @submit="requestChange('custom')" />
      <TeamAccessNameForm v-model:name="instanceName" @error="error = $event" />
      <TeamAccessWeekStartSetting v-model="nextWeekFromSaturday" @error="error = $event" />

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </template>

    <TeamAccessConfirmDialog
      v-model:visible="confirmVisible"
      :removing="pendingAction === 'remove'"
      :first-code="!access?.code"
      :saving="saving"
      @confirm="applyChange(pendingAction!)"
    />
  </div>
</template>
