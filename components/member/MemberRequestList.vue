<script setup lang="ts">
import type { MessageKey } from "~/i18n/types";
import { REQUEST_STATUS_KEYS, type ShiftRequest } from "~/types/shift-request";
import { ownRequestAction, type RequestAction } from "~/utils/request-actions";
import { formatRequestPeriod } from "~/utils/request-period";

// Open takeovers from the team, swaps and undo asks addressed to the member and the member's own requests.
const props = defineProps<{ requests: ShiftRequest[]; memberId: number; busy: number | null }>();
const emit = defineEmits<{
  (e: "take", request: ShiftRequest): void;
  (e: "act", request: ShiftRequest, action: RequestAction): void;
}>();
const localeTag = useLocaleTag();
const { t } = useI18n();

const openTakeovers = computed(() =>
  props.requests.filter((r) => r.kind === "takeover" && r.status === "open" && r.requester_staff_id !== props.memberId)
);
const swapsForMe = computed(() => props.requests.filter((r) => r.kind === "swap" && r.status === "open" && r.partner_staff_id === props.memberId));
const undoForMe = computed(() =>
  props.requests.filter((r) => r.status === "done" && r.undo_requested_by !== null && r.undo_requested_by !== props.memberId)
);
const mine = computed(() =>
  props.requests.filter(
    (r) =>
      !openTakeovers.value.includes(r) &&
      !swapsForMe.value.includes(r) &&
      !undoForMe.value.includes(r) &&
      (r.requester_staff_id === props.memberId || r.partner_staff_id === props.memberId)
  )
);

function title(request: ShiftRequest): string {
  return request.kind === "takeover" ? `${request.requester_name} · ${request.shift_name}` : `${request.requester_name} ↔ ${request.partner_name ?? "?"}`;
}

function detail(request: ShiftRequest): string {
  const parts = [formatRequestPeriod(localeTag.value, request)];
  if (request.kind === "takeover" && request.partner_name) parts.push(t("requests.list.takenBy", { name: request.partner_name }));
  parts.push(t(request.status === "done" && request.undo_requested_by !== null ? "requests.list.undoAsked" : REQUEST_STATUS_KEYS[request.status]));
  return parts.join(" · ");
}

function ownAction(request: ShiftRequest): { label: MessageKey; action: RequestAction } | null {
  return ownRequestAction(request, props.memberId);
}
</script>

<template>
  <div v-if="undoForMe.length > 0" class="space-y-2">
    <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">{{ t("requests.list.undoForMe") }}</h4>
    <div v-for="request in undoForMe" :key="request.request_id" class="member-request">
      <div class="min-w-0 flex-1">
        <p class="font-medium text-[var(--text-1)]">{{ title(request) }}</p>
        <p class="text-[var(--text-2)]">{{ t("requests.list.undoDetail", { period: formatRequestPeriod(localeTag, request) }) }}</p>
      </div>
      <div class="flex gap-1.5">
        <PrimeButton
          :label="t('common.actions.decline')"
          size="small"
          text
          :disabled="busy === request.request_id"
          @click="emit('act', request, 'decline_undo')"
        />
        <PrimeButton
          :label="t('requests.list.confirmUndo')"
          size="small"
          class="min-h-9"
          :loading="busy === request.request_id"
          @click="emit('act', request, 'confirm_undo')"
        />
      </div>
    </div>
  </div>

  <div v-if="openTakeovers.length > 0" class="space-y-2">
    <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">{{ t("requests.list.takeoversOpen") }}</h4>
    <div v-for="request in openTakeovers" :key="request.request_id" class="member-request">
      <div class="min-w-0 flex-1">
        <p class="font-medium text-[var(--text-1)]">{{ title(request) }}</p>
        <p class="text-[var(--text-2)]">{{ formatRequestPeriod(localeTag, request) }}</p>
        <p v-if="request.message" class="italic text-[var(--text-3)]">{{ request.message }}</p>
      </div>
      <PrimeButton :label="t('requests.list.take')" size="small" class="min-h-9" :loading="busy === request.request_id" @click="emit('take', request)" />
    </div>
  </div>

  <div v-if="swapsForMe.length > 0" class="space-y-2">
    <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">{{ t("requests.list.swapsForMe") }}</h4>
    <div v-for="request in swapsForMe" :key="request.request_id" class="member-request">
      <div class="min-w-0 flex-1">
        <p class="font-medium text-[var(--text-1)]">{{ t("requests.list.wantsToSwap", { name: request.requester_name }) }}</p>
        <p class="text-[var(--text-2)]">{{ t("requests.list.allShifts", { period: formatRequestPeriod(localeTag, request) }) }}</p>
        <p v-if="request.message" class="italic text-[var(--text-3)]">{{ request.message }}</p>
      </div>
      <div class="flex gap-1.5">
        <PrimeButton
          :label="t('common.actions.decline')"
          size="small"
          text
          :disabled="busy === request.request_id"
          @click="emit('act', request, 'decline')"
        />
        <PrimeButton
          :label="t('requests.list.accept')"
          size="small"
          class="min-h-9"
          :loading="busy === request.request_id"
          @click="emit('act', request, 'accept')"
        />
      </div>
    </div>
  </div>

  <div v-if="mine.length > 0" class="space-y-2">
    <h4 class="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">{{ t("requests.list.mine") }}</h4>
    <div v-for="request in mine" :key="request.request_id" class="member-request">
      <div class="min-w-0 flex-1">
        <p class="font-medium text-[var(--text-1)]">{{ title(request) }}</p>
        <p class="text-[var(--text-2)]">{{ detail(request) }}</p>
      </div>
      <PrimeButton
        v-if="ownAction(request)"
        :label="t(ownAction(request)!.label)"
        size="small"
        text
        severity="secondary"
        :loading="busy === request.request_id"
        @click="emit('act', request, ownAction(request)!.action)"
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
