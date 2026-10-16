<script setup lang="ts">
import type { WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import type { Absence } from "~/types/absence";
import { assignmentsReplacedByFill, planShowsWeek } from "~/utils/plan-week";
import { requestErrorStatus } from "~/utils/request-error";

const appStore = useAppStore();
const dataStore = useDataStore();
const { authFetch } = useAuthFetch();
const { notify } = useErrorNotices();
const { status: viewerStatus, load: loadViewerStatus, login: viewerLogin } = useViewerAccess();
const { detect: detectPush } = usePushNotifications();
const { inviteCode } = usePlannerDeepLinks(redeemAccessCode);
const { t } = useI18n();

const { member, load: loadMember } = useMember();
await Promise.all([useAsyncData("viewer-status", () => loadViewerStatus()), useAsyncData("member", () => loadMember())]);
const needsAccessCode = computed(() => viewerStatus.value?.hasAccess === false);
const accessError = ref("");
watchAccessGranted(needsAccessCode, onAccessGranted);

const {
  data: shiftplan,
  pending,
  error: planError,
  refresh,
} = await useFetch<WeeklyShiftplanWithPattern | null>("/api/shiftplan", {
  query: {
    year: computed(() => appStore.selectedYear),
    week: computed(() => appStore.selectedWeek),
  },
  watch: [() => appStore.selectedYear, () => appStore.selectedWeek],
  immediate: !needsAccessCode.value,
  // A failed first load leaves this, not undefined; with undefined, later week switches would not load at all.
  default: () => null,
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
const confirmFill = ref(false);
const { weekPreviewSentinel, showWeekPreview } = useWeekPreviewReveal();
// Counts saved changes, so the preview of the next weeks reloads with the plan.
const planRevision = ref(0);
// The skeleton only covers a week whose plan is not there yet, not a reload after a change.
const showSkeleton = computed(() => pending.value && !planShowsWeek(shiftplan.value, appStore.selectedYear, appStore.selectedWeek));
// Unknown (null) while the selected week's plan loads or failed: the hero button waits, any other trigger asks.
const replacedByFill = computed(() =>
  assignmentsReplacedByFill(shiftplan.value, dataStore.rotationPattern, {
    year: appStore.selectedYear,
    week: appStore.selectedWeek,
    loading: pending.value,
  })
);

async function refreshWeek() {
  await Promise.all([refresh(), refreshAbsences()]);
  planRevision.value++;
}

// An expired or changed team code refuses the plan; then the code gate is what helps, not a network error.
watch(planError, (error) => {
  if (requestErrorStatus(error) === 401) loadViewerStatus().catch(() => {});
});

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
    accessError.value = t("app.teamAccess.linkExpired");
  }
}

function requestFill() {
  if (replacedByFill.value === 0) void generateFromPattern();
  else confirmFill.value = true;
}

async function generateFromPattern() {
  generating.value = true;
  try {
    await authFetch("/api/shiftplan/generate", { method: "POST", body: { year: appStore.selectedYear, week: appStore.selectedWeek } });
  } catch (error) {
    notify(error, "planner.week.fill.failed");
  }
  confirmFill.value = false;
  await refreshWeek();
  generating.value = false;
}
</script>

<template>
  <div>
    <PlannerInviteNotice v-model:invite-code="inviteCode" :has-member="Boolean(member)" @signed-in="onMemberSignedIn" />

    <TeamAccessGate v-if="needsAccessCode" :key="accessError" :initial-error="accessError" />

    <PlannerWeekShell
      v-else
      :shiftplan="shiftplan"
      :pending="showSkeleton"
      :absences="absences ?? []"
      :member="member"
      :generating="generating"
      :fill-ready="replacedByFill !== null"
      @updated="refreshWeek"
      @generate="requestFill"
      @generated="refreshWeek"
    >
      <div ref="weekPreviewSentinel">
        <LazyWeekPreview v-if="showWeekPreview" :revision="planRevision" />
      </div>
    </PlannerWeekShell>

    <LazyPlannerFillConfirmDialog
      v-if="confirmFill"
      v-model:visible="confirmFill"
      :count="replacedByFill"
      :pattern-week="shiftplan?.pattern_week"
      :generating="generating"
      @confirm="generateFromPattern"
    />
  </div>
</template>
