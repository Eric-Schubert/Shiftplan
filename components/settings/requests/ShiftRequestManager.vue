<script setup lang="ts">
import { REQUEST_STATUS_KEYS, type ShiftRequest } from "~/types/shift-request";
import { formatRequestPeriod } from "~/utils/request-period";

const authStore = useAuthStore();
const { authFetch } = useAuthFetch();
const localeTag = useLocaleTag();
const { t } = useI18n();
const requestError = useRequestError();
const requests = ref<ShiftRequest[]>([]);
const requiresApproval = ref(false);
const loading = ref(true);
const busy = ref<number | null>(null);
const error = ref("");

const pending = computed(() => requests.value.filter((request) => request.status === "pending_approval"));
const others = computed(() => requests.value.filter((request) => request.status !== "pending_approval"));

function summary(request: ShiftRequest): string {
  if (request.kind === "takeover") {
    const helper = request.partner_name ? t("settings.requests.summary.takenBy", { name: request.partner_name }) : t("settings.requests.summary.seeking");
    return `${request.requester_name} · ${request.shift_name} · ${helper}`;
  }
  return t("settings.requests.summary.swap", { requester: request.requester_name, partner: request.partner_name ?? "?" });
}

function statusLine(request: ShiftRequest): string {
  if (request.status === "done" && request.undo_requested_by !== null) {
    return `${t(REQUEST_STATUS_KEYS.done)} · ${t("requests.list.undoAsked")}`;
  }
  const status = t(REQUEST_STATUS_KEYS[request.status]);
  if (!request.decided_by) return status;
  const byStaff = request.status === "reverted" && request.undo_requested_by !== null;
  return t(byStaff ? "settings.requests.decidedByUndo" : "settings.requests.decidedBy", { status, name: request.decided_by });
}

async function load() {
  loading.value = true;
  try {
    const result = await authFetch<{ requiresApproval: boolean; requests: ShiftRequest[] }>("/api/requests");
    requests.value = result.requests;
    requiresApproval.value = result.requiresApproval;
  } finally {
    loading.value = false;
  }
}

async function decide(request: ShiftRequest, action: "approve" | "reject" | "revert") {
  busy.value = request.request_id;
  error.value = "";
  try {
    await authFetch(`/api/requests/${request.request_id}`, { method: "POST", body: { action } });
    await load();
  } catch (cause) {
    error.value = requestError(cause, "settings.requests.failed");
  } finally {
    busy.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <p class="max-w-[46rem] text-sm leading-6 text-[var(--text-2)]">{{ t("settings.requests.intro") }}</p>

    <ShiftRequestApprovalSetting v-if="authStore.isAdmin" v-model="requiresApproval" @error="error = $event" />

    <div v-if="loading" class="flex items-center gap-3 text-sm text-[var(--text-2)]">
      <PrimeProgressSpinner class="!h-5 !w-5" />
      {{ t("settings.loading") }}
    </div>

    <template v-else>
      <section v-if="pending.length > 0" class="space-y-2">
        <h3 class="text-sm font-semibold text-[var(--text-1)]">{{ t("requests.status.pending_approval") }}</h3>
        <ul class="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)]">
          <li v-for="request in pending" :key="request.request_id" class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div class="min-w-0 flex-1 text-sm">
              <p class="font-medium text-[var(--text-1)]">{{ formatRequestPeriod(localeTag, request) }} · {{ summary(request) }}</p>
              <p v-if="request.message" class="italic text-[var(--text-3)]">{{ request.message }}</p>
            </div>
            <div class="flex gap-2">
              <PrimeButton
                :label="t('common.actions.decline')"
                size="small"
                severity="secondary"
                text
                :disabled="busy !== null"
                @click="decide(request, 'reject')"
              />
              <PrimeButton
                :label="t('settings.requests.approve')"
                size="small"
                icon="pi pi-check"
                :loading="busy === request.request_id"
                @click="decide(request, 'approve')"
              />
            </div>
          </li>
        </ul>
      </section>

      <section class="space-y-2">
        <h3 class="text-sm font-semibold text-[var(--text-1)]">{{ t("settings.requests.recent") }}</h3>
        <p v-if="others.length === 0" class="text-sm text-[var(--text-3)]">{{ t("settings.requests.empty") }}</p>
        <ul v-else class="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)]">
          <li v-for="request in others" :key="request.request_id" class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div class="min-w-0 flex-1 text-sm">
              <p class="font-medium text-[var(--text-1)]">{{ formatRequestPeriod(localeTag, request) }} · {{ summary(request) }}</p>
              <p class="text-xs text-[var(--text-3)]">
                {{ statusLine(request) }}
              </p>
            </div>
            <PrimeButton
              v-if="request.status === 'done'"
              :label="t('settings.requests.revert')"
              size="small"
              severity="secondary"
              outlined
              class="min-h-9 self-start sm:self-center"
              :loading="busy === request.request_id"
              @click="decide(request, 'revert')"
            />
          </li>
        </ul>
      </section>
    </template>

    <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
  </div>
</template>
