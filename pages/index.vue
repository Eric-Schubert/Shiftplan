<script setup lang="ts">
import type { WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import type { Absence } from "~/types/absence";
import { providePlannerWeek } from "~/composables/usePlannerWeek";
import { requestErrorStatus } from "~/utils/request-error";

const appStore = useAppStore();
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
const { weekPreviewSentinel, showWeekPreview } = useWeekPreviewReveal();
// Everything under the shell reaches the week through usePlannerWeek().
const { generating, confirmFill, planRevision, replacedByFill, refreshWeek, generateFromPattern } = providePlannerWeek({
  shiftplan,
  pending,
  absences,
  refresh,
  refreshAbsences,
});

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
</script>

<template>
  <div>
    <PlannerInviteNotice v-model:invite-code="inviteCode" :has-member="Boolean(member)" @signed-in="onMemberSignedIn" />

    <TeamAccessGate v-if="needsAccessCode" :key="accessError" :initial-error="accessError" />

    <PlannerWeekShell v-else :member="member">
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
