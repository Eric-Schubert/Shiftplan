<script setup lang="ts">
import { REQUEST_STATUS_LABELS, type ShiftRequest } from "~/types/shift-request";
import { formatRequestPeriod } from "~/utils/request-period";

type RequestAction = "accept" | "decline" | "cancel";

// Open takeovers from the team, swaps addressed to the member and the member's own requests.
const props = defineProps<{ requests: ShiftRequest[]; memberId: number; busy: number | null }>();
const emit = defineEmits<{
  (e: "take", request: ShiftRequest): void;
  (e: "act", request: ShiftRequest, action: RequestAction): void;
}>();

const openTakeovers = computed(() =>
  props.requests.filter((r) => r.kind === "takeover" && r.status === "open" && r.requester_staff_id !== props.memberId)
);
const swapsForMe = computed(() =>
  props.requests.filter((r) => r.kind === "swap" && r.status === "open" && r.partner_staff_id === props.memberId)
);
const mine = computed(() =>
  props.requests.filter(
    (r) => !openTakeovers.value.includes(r) && !swapsForMe.value.includes(r) &&
      (r.requester_staff_id === props.memberId || r.partner_staff_id === props.memberId)
  )
);

function title(request: ShiftRequest): string {
  return request.kind === "takeover"
    ? `${request.requester_name} · ${request.shift_name}`
    : `${request.requester_name} ↔ ${request.partner_name ?? "?"}`;
}

function detail(request: ShiftRequest): string {
  const parts = [formatRequestPeriod(request)];
  if (request.kind === "takeover" && request.partner_name) parts.push(`übernimmt: ${request.partner_name}`);
  parts.push(REQUEST_STATUS_LABELS[request.status]);
  return parts.join(" · ");
}

function canCancel(request: ShiftRequest): boolean {
  return request.requester_staff_id === props.memberId && (request.status === "open" || request.status === "pending_approval");
}
</script>

<template>
  <div v-if="openTakeovers.length > 0" class="space-y-2">
    <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Übernahme gesucht</h4>
    <div v-for="request in openTakeovers" :key="request.request_id" class="member-request">
      <div class="min-w-0 flex-1">
        <p class="font-medium text-[var(--text-1)]">{{ title(request) }}</p>
        <p class="text-[var(--text-2)]">{{ formatRequestPeriod(request) }}</p>
        <p v-if="request.message" class="italic text-[var(--text-3)]">{{ request.message }}</p>
      </div>
      <PrimeButton label="Übernehmen" size="small" class="min-h-9" :loading="busy === request.request_id" @click="emit('take', request)" />
    </div>
  </div>

  <div v-if="swapsForMe.length > 0" class="space-y-2">
    <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Tauschanfragen an dich</h4>
    <div v-for="request in swapsForMe" :key="request.request_id" class="member-request">
      <div class="min-w-0 flex-1">
        <p class="font-medium text-[var(--text-1)]">{{ request.requester_name }} möchte tauschen</p>
        <p class="text-[var(--text-2)]">Alle Schichten, {{ formatRequestPeriod(request) }}</p>
        <p v-if="request.message" class="italic text-[var(--text-3)]">{{ request.message }}</p>
      </div>
      <div class="flex gap-1.5">
        <PrimeButton label="Ablehnen" size="small" text :disabled="busy === request.request_id" @click="emit('act', request, 'decline')" />
        <PrimeButton label="Zusagen" size="small" class="min-h-9" :loading="busy === request.request_id" @click="emit('act', request, 'accept')" />
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
        @click="emit('act', request, 'cancel')"
      />
    </div>
  </div>
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
