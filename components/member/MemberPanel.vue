<script setup lang="ts">
import type { ShiftRequest } from "~/types/shift-request";
import type { MemberProfile } from "~/composables/useMember";

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
