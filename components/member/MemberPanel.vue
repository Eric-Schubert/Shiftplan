<script setup lang="ts">
import type { ShiftRequest } from "~/types/shift-request";
import type { MemberProfile } from "~/composables/useMember";
import type { MessageKey } from "~/i18n/types";
import type { RequestAction } from "~/utils/request-actions";

// Everything a signed-in staff member does in the browser: report absences and handle requests.
defineProps<{ member: MemberProfile }>();
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

const requests = computed(() => data.value?.requests ?? []);
const { t } = useI18n();

const NOTICES: Partial<Record<RequestAction, MessageKey>> = {
  cancel: "requests.notice.cancel",
  decline: "requests.notice.decline",
  request_undo: "requests.notice.request_undo",
  confirm_undo: "requests.notice.confirm_undo",
  decline_undo: "requests.notice.decline_undo",
};

async function act(request: ShiftRequest, action: RequestAction) {
  busy.value = request.request_id;
  error.value = "";
  notice.value = "";
  try {
    const result = await $fetch<{ request: ShiftRequest }>(`/api/member/requests/${request.request_id}`, {
      method: "POST",
      body: { action },
    });
    notice.value = t(
      NOTICES[action] ?? (result.request.status === "pending_approval" ? "requests.notice.accepted" : "requests.notice.done")
    );
    await refresh();
    emit("updated");
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || t("member.panel.failed");
  } finally {
    busy.value = null;
    confirming.value = null;
  }
}

async function onAbsence(result: { notified: boolean; takeovers: boolean }) {
  notice.value = t(
    result.takeovers
      ? "absence.member.reported.takeovers"
      : result.notified
        ? "absence.member.reported.notified"
        : "absence.member.reported.plain"
  );
  await refresh();
  emit("updated");
}

async function onRequest() {
  notice.value = t("requests.notice.sent");
  await refresh();
}

defineExpose({ refresh });
</script>

<template>
  <section id="anfragen" class="planner-slab space-y-4 !py-4">
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-1 basis-48">
        <h3 class="text-sm font-semibold text-[var(--text-1)]">{{ t("member.panel.hello", { name: member.name.split(" ")[0] ?? "" }) }}</h3>
        <p class="text-sm text-[var(--text-2)]">{{ t("member.panel.marked") }}</p>
      </div>
      <PrimeButton :label="t('absence.member.report')" icon="pi pi-calendar-times" size="small" class="min-h-9" @click="showAbsence = true" />
      <PrimeButton
        :label="t('requests.dialog.header')"
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

    <MemberRequestList :requests="requests" :member-id="member.id" :busy="busy" @take="confirming = $event" @act="act" />

    <MemberTakeoverConfirmDialog
      v-model:request="confirming"
      :busy="confirming !== null && busy === confirming.request_id"
      @confirm="act($event, 'accept')"
    />

    <LazyMemberAbsenceDialog v-if="showAbsence" v-model:visible="showAbsence" @created="onAbsence" />
    <LazyMemberRequestDialog v-if="showRequest" v-model:visible="showRequest" :staff-id="member.id" @created="onRequest" />
  </section>
</template>
