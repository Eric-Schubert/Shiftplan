<script setup lang="ts">
import { REQUEST_STATUS_LABELS, type ShiftRequest } from "~/types/shift-request";
import { formatRequestPeriod } from "~/utils/request-period";

const authStore = useAuthStore();
const { authFetch } = useAuthFetch();
const requests = ref<ShiftRequest[]>([]);
const requiresApproval = ref(false);
const loading = ref(true);
const busy = ref<number | null>(null);
const error = ref("");

const pending = computed(() => requests.value.filter((request) => request.status === "pending_approval"));
const others = computed(() => requests.value.filter((request) => request.status !== "pending_approval"));

function summary(request: ShiftRequest): string {
  if (request.kind === "takeover") {
    const helper = request.partner_name ? `${request.partner_name} übernimmt` : "sucht Ersatz";
    return `${request.requester_name} · ${request.shift_name} · ${helper}`;
  }
  return `${request.requester_name} ↔ ${request.partner_name ?? "?"} tauschen alle Schichten`;
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
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Die Anfrage konnte nicht geändert werden";
  } finally {
    busy.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <p class="max-w-[46rem] text-sm leading-6 text-[var(--text-2)]">
      In der App können Mitarbeitende eine Übernahme für eine Schicht suchen oder mit einer Kollegin oder einem
      Kollegen für einen Zeitraum alle Schichten tauschen. Der Wochenplan bleibt dabei unverändert, geändert wird
      nur der betroffene Zeitraum.
    </p>

    <ShiftRequestApprovalSetting v-if="authStore.isAdmin" v-model="requiresApproval" @error="error = $event" />

    <div v-if="loading" class="flex items-center gap-3 text-sm text-[var(--text-2)]">
      <PrimeProgressSpinner class="!h-5 !w-5" />
      Wird geladen.
    </div>

    <template v-else>
      <section v-if="pending.length > 0" class="space-y-2">
        <h3 class="text-sm font-semibold text-[var(--text-1)]">Wartet auf Freigabe</h3>
        <ul class="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)]">
          <li v-for="request in pending" :key="request.request_id" class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div class="min-w-0 flex-1 text-sm">
              <p class="font-medium text-[var(--text-1)]">{{ formatRequestPeriod(request) }} · {{ summary(request) }}</p>
              <p v-if="request.message" class="italic text-[var(--text-3)]">{{ request.message }}</p>
            </div>
            <div class="flex gap-2">
              <PrimeButton label="Ablehnen" size="small" severity="secondary" text :disabled="busy !== null" @click="decide(request, 'reject')" />
              <PrimeButton label="Freigeben" size="small" icon="pi pi-check" :loading="busy === request.request_id" @click="decide(request, 'approve')" />
            </div>
          </li>
        </ul>
      </section>

      <section class="space-y-2">
        <h3 class="text-sm font-semibold text-[var(--text-1)]">Offene und letzte Anfragen</h3>
        <p v-if="others.length === 0" class="text-sm text-[var(--text-3)]">Noch keine Anfragen.</p>
        <ul v-else class="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)]">
          <li v-for="request in others" :key="request.request_id" class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div class="min-w-0 flex-1 text-sm">
              <p class="font-medium text-[var(--text-1)]">{{ formatRequestPeriod(request) }} · {{ summary(request) }}</p>
              <p class="text-xs text-[var(--text-3)]">
                {{ REQUEST_STATUS_LABELS[request.status] }}<template v-if="request.decided_by"> · {{ request.decided_by }}</template>
              </p>
            </div>
            <PrimeButton
              v-if="request.status === 'done'"
              label="Zurücknehmen"
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
