<script setup lang="ts">
import { formatAbsenceDay } from "~/types/absence";
import { REQUEST_STATUS_LABELS, type ShiftRequest } from "~/types/shift-request";
import type { MemberProfile } from "~/composables/useMember";

// Everything a signed-in staff member does in the browser: report absences and handle requests.
const props = defineProps<{ member: MemberProfile }>();
const emit = defineEmits<{ (e: "updated"): void }>();

const { data, refresh } = await useFetch<{ requiresApproval: boolean; requests: ShiftRequest[] }>("/api/member/requests", {
  default: () => ({ requiresApproval: false, requests: [] }),
});

const showAbsence = ref(false);
const showRequest = ref(false);
const confirming = ref<ShiftRequest | null>(null);
const busy = ref<number | null>(null);
const notice = ref("");
const error = ref("");

const me = computed(() => props.member.id);
const requests = computed(() => data.value?.requests ?? []);
const openTakeovers = computed(() =>
  requests.value.filter((r) => r.kind === "takeover" && r.status === "open" && r.requester_staff_id !== me.value)
);
const swapsForMe = computed(() =>
  requests.value.filter((r) => r.kind === "swap" && r.status === "open" && r.partner_staff_id === me.value)
);
const mine = computed(() =>
  requests.value.filter(
    (r) => !openTakeovers.value.includes(r) && !swapsForMe.value.includes(r) &&
      (r.requester_staff_id === me.value || r.partner_staff_id === me.value)
  )
);

function period(request: ShiftRequest): string {
  return request.date_from === request.date_to
    ? formatAbsenceDay(request.date_from)
    : `${formatAbsenceDay(request.date_from)} – ${formatAbsenceDay(request.date_to)}`;
}

function title(request: ShiftRequest): string {
  return request.kind === "takeover"
    ? `${request.requester_name} · ${request.shift_name}`
    : `${request.requester_name} ↔ ${request.partner_name ?? "?"}`;
}

function detail(request: ShiftRequest): string {
  const parts = [period(request)];
  if (request.kind === "takeover" && request.partner_name) parts.push(`übernimmt: ${request.partner_name}`);
  parts.push(REQUEST_STATUS_LABELS[request.status]);
  return parts.join(" · ");
}

function canCancel(request: ShiftRequest): boolean {
  return request.requester_staff_id === me.value && (request.status === "open" || request.status === "pending_approval");
}

async function act(request: ShiftRequest, action: "accept" | "decline" | "cancel") {
  busy.value = request.request_id;
  error.value = "";
  notice.value = "";
  try {
    const result = await $fetch<{ request: ShiftRequest }>(`/api/member/requests/${request.request_id}`, {
      method: "POST",
      body: { action },
    });
    notice.value =
      action === "cancel"
        ? "Anfrage zurückgezogen."
        : action === "decline"
          ? "Tausch abgelehnt."
          : result.request.status === "pending_approval"
            ? "Zugesagt. Die Planung muss noch freigeben."
            : "Erledigt, der Plan ist angepasst.";
    await refresh();
    emit("updated");
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Das hat nicht geklappt";
  } finally {
    busy.value = null;
    confirming.value = null;
  }
}

async function onAbsence(result: { notified: boolean; takeovers: boolean }) {
  notice.value = result.takeovers
    ? "Ausfall gemeldet, das Team kann deine Schichten übernehmen."
    : result.notified
      ? "Ausfall gemeldet, das Team ist informiert."
      : "Ausfall gemeldet.";
  await refresh();
  emit("updated");
}

async function onRequest() {
  notice.value = "Anfrage gesendet.";
  await refresh();
}

defineExpose({ refresh });
</script>

<template>
  <section id="anfragen" class="planner-slab space-y-4 !py-4">
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-1 basis-48">
        <h3 class="text-sm font-semibold text-[var(--text-1)]">Hallo {{ member.name.split(" ")[0] }}</h3>
        <p class="text-sm text-[var(--text-2)]">Deine Schichten sind im Plan markiert.</p>
      </div>
      <PrimeButton label="Ausfall melden" icon="pi pi-calendar-times" size="small" class="min-h-9" @click="showAbsence = true" />
      <PrimeButton
        label="Neue Anfrage"
        icon="pi pi-arrow-right-arrow-left"
        size="small"
        severity="secondary"
        outlined
        class="min-h-9"
        @click="showRequest = true"
      />
    </div>

    <p v-if="notice" class="text-sm text-[var(--positive-ink)]" role="status">{{ notice }}</p>
    <p v-if="error" class="text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</p>

    <div v-if="openTakeovers.length > 0" class="space-y-2">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Übernahme gesucht</h4>
      <div v-for="request in openTakeovers" :key="request.request_id" class="member-request">
        <div class="min-w-0 flex-1">
          <p class="font-medium text-[var(--text-1)]">{{ title(request) }}</p>
          <p class="text-[var(--text-2)]">{{ period(request) }}</p>
          <p v-if="request.message" class="italic text-[var(--text-3)]">{{ request.message }}</p>
        </div>
        <PrimeButton label="Übernehmen" size="small" class="min-h-9" :loading="busy === request.request_id" @click="confirming = request" />
      </div>
    </div>

    <div v-if="swapsForMe.length > 0" class="space-y-2">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Tauschanfragen an dich</h4>
      <div v-for="request in swapsForMe" :key="request.request_id" class="member-request">
        <div class="min-w-0 flex-1">
          <p class="font-medium text-[var(--text-1)]">{{ request.requester_name }} möchte tauschen</p>
          <p class="text-[var(--text-2)]">Alle Schichten, {{ period(request) }}</p>
          <p v-if="request.message" class="italic text-[var(--text-3)]">{{ request.message }}</p>
        </div>
        <div class="flex gap-1.5">
          <PrimeButton label="Ablehnen" size="small" text :disabled="busy === request.request_id" @click="act(request, 'decline')" />
          <PrimeButton label="Zusagen" size="small" class="min-h-9" :loading="busy === request.request_id" @click="act(request, 'accept')" />
        </div>
      </div>
    </div>

    <div v-if="mine.length > 0" class="space-y-2">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Deine Anfragen und Zusagen</h4>
      <div v-for="request in mine" :key="request.request_id" class="member-request">
        <div class="min-w-0 flex-1">
          <p class="font-medium text-[var(--text-1)]">{{ title(request) }}</p>
          <p class="text-[var(--text-2)]">{{ detail(request) }}</p>
        </div>
        <PrimeButton
          v-if="canCancel(request)"
          label="Zurückziehen"
          size="small"
          text
          severity="secondary"
          :loading="busy === request.request_id"
          @click="act(request, 'cancel')"
        />
      </div>
    </div>

    <PrimeDialog
      :visible="confirming !== null"
      header="Schicht übernehmen?"
      modal
      :style="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }"
      @update:visible="!$event && (confirming = null)"
    >
      <p v-if="confirming" class="text-sm text-[var(--text-2)]">
        Du übernimmst {{ confirming.shift_name }} am {{ period(confirming) }} für {{ confirming.requester_name }}. Hast du an
        dem Tag eine eigene Schicht, wirst du dort ausgetragen.
      </p>
      <template #footer>
        <PrimeButton label="Abbrechen" text @click="confirming = null" />
        <PrimeButton
          label="Übernehmen"
          icon="pi pi-check"
          :loading="confirming !== null && busy === confirming.request_id"
          @click="confirming && act(confirming, 'accept')"
        />
      </template>
    </PrimeDialog>

    <LazyMemberAbsenceDialog v-if="showAbsence" v-model:visible="showAbsence" @created="onAbsence" />
    <LazyMemberRequestDialog v-if="showRequest" v-model:visible="showRequest" :staff-id="member.id" @created="onRequest" />
  </section>
</template>

<style scoped>
.member-request {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--border-soft);
  border-radius: 0.75rem;
  background: var(--surface);
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
}
</style>
