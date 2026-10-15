<script setup lang="ts">
import type { WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import type { Absence } from "~/types/absence";

const appStore = useAppStore();
const { authFetch } = useAuthFetch();
const { status: viewerStatus, load: loadViewerStatus, login: viewerLogin } = useViewerAccess();
const { detect: detectPush } = usePushNotifications();
const { inviteCode } = usePlannerDeepLinks(redeemAccessCode);

const { member, load: loadMember } = useMember();
await Promise.all([
  useAsyncData("viewer-status", () => loadViewerStatus()),
  useAsyncData("member", () => loadMember()),
]);
const needsAccessCode = computed(() => viewerStatus.value?.hasAccess === false);
const accessError = ref("");
watchAccessGranted(needsAccessCode, onAccessGranted);

const {
  data: shiftplan,
  pending,
  refresh,
} = await useFetch<WeeklyShiftplanWithPattern>("/api/shiftplan", {
  query: {
    year: computed(() => appStore.selectedYear),
    week: computed(() => appStore.selectedWeek),
  },
  watch: [() => appStore.selectedYear, () => appStore.selectedWeek],
  immediate: !needsAccessCode.value,
});
const { data: absences, refresh: refreshAbsences } = await useFetch<Absence[]>("/api/absences", {
  query: {
    year: computed(() => appStore.selectedYear),
    week: computed(() => appStore.selectedWeek),
  },
  watch: [() => appStore.selectedYear, () => appStore.selectedWeek],
  immediate: !needsAccessCode.value,
  default: () => [],
});
const generating = ref(false);
const { weekPreviewSentinel, showWeekPreview } = useWeekPreviewReveal();

async function refreshWeek() {
  await Promise.all([refresh(), refreshAbsences()]);
}

async function onMemberSignedIn() {
  inviteCode.value = null;
  const wasGated = needsAccessCode.value;
  await loadViewerStatus();
  // When the sign-in opened the gate, watchAccessGranted already loads the week.
  if (!wasGated) await onAccessGranted();
}

async function onAccessGranted() {
  accessError.value = "";
  await refreshWeek();
  void detectPush();
}

async function redeemAccessCode(code: string) {
  if (!needsAccessCode.value) return;
  try {
    await viewerLogin(code);
  } catch {
    accessError.value = "Der Zugangscode aus dem Link ist nicht mehr gültig.";
  }
}

async function generateFromPattern() {
  generating.value = true;
  try {
    await authFetch("/api/shiftplan/generate", {
      method: "POST",
      body: {
        year: appStore.selectedYear,
        week: appStore.selectedWeek,
      },
    });
    await refresh();
  } finally {
    generating.value = false;
  }
}
</script>

<template>
  <div>
    <PlannerInviteNotice
      v-model:invite-code="inviteCode"
      :has-member="Boolean(member)"
      @signed-in="onMemberSignedIn"
    />

    <TeamAccessGate
      v-if="needsAccessCode"
      :key="accessError"
      :initial-error="accessError"
    />

    <PlannerWeekShell
      v-else
      :shiftplan="shiftplan"
      :pending="pending"
      :absences="absences ?? []"
      :member="member"
      :generating="generating"
      @updated="refreshWeek"
      @generate="generateFromPattern"
      @generated="refresh"
    >
      <div ref="weekPreviewSentinel">
        <LazyWeekPreview v-if="showWeekPreview" />
      </div>
    </PlannerWeekShell>
  </div>
</template>
