<script setup lang="ts">
import type { MemberProfile } from "~/composables/useMember";
import { usePlannerWeek } from "~/composables/usePlannerWeek";
import { useSwipe } from "~/composables/useSwipe";

defineProps<{
  member: MemberProfile | null;
}>();

const appStore = useAppStore();
const authStore = useAuthStore();
const { shiftplan, generating, fillReady, refreshWeek, requestFill } = usePlannerWeek();

const swipeContainer = ref<HTMLElement | null>(null);
const showBulkDialog = ref(false);
const showNotifyDialog = ref(false);

const { isSwiping, swipeDirection, swipeOffset } = useSwipe(swipeContainer, {
  onSwipeLeft: () => appStore.nextWeek(),
  onSwipeRight: () => appStore.previousWeek(),
});

const contentSlideClass = computed(() => {
  if (swipeDirection.value === "left") return "content-slide-left";
  if (swipeDirection.value === "right") return "content-slide-right";
  return "";
});
const contentSlideStyle = computed(() =>
  isSwiping.value ? { transform: `translateX(${swipeOffset.value}px)`, opacity: 1 - Math.abs(swipeOffset.value) / 200 } : {}
);

function jumpWeeks(offset: number) {
  for (let index = 0; index < offset; index += 1) {
    appStore.nextWeek();
  }
}
</script>

<template>
  <div ref="swipeContainer" class="planner-shell">
    <PlannerWeekHero
      :selected-week="appStore.selectedWeek"
      :selected-year="appStore.selectedYear"
      :is-current-week="appStore.isCurrentWeek"
      :current-week-label="appStore.currentWeekLabel"
      :pattern-week="shiftplan?.pattern_week"
      :can-edit-shifts="authStore.canEditShifts"
      :generating="generating"
      :fill-disabled="!fillReady"
      @previous="appStore.previousWeek"
      @today="appStore.goToCurrentWeek"
      @next="appStore.nextWeek"
      @jump="jumpWeeks"
      @generate="requestFill"
      @open-bulk="showBulkDialog = true"
      @notify-team="showNotifyDialog = true"
    />

    <PushPromptCard v-if="!authStore.canEditShifts" />

    <MemberPanel v-if="member" :member="member" @updated="refreshWeek" />

    <PlannerWeekBoard :my-staff-id="member?.id ?? null" :swipe-class="contentSlideClass" :swipe-style="contentSlideStyle" />

    <slot />

    <LazyPlannerBulkGenerateDialog
      v-if="showBulkDialog"
      :visible="showBulkDialog"
      :year="appStore.selectedYear"
      :week="appStore.selectedWeek"
      @update:visible="showBulkDialog = $event"
      @generated="refreshWeek"
    />

    <LazyTeamNotifyDialog v-if="showNotifyDialog" :visible="showNotifyDialog" @update:visible="showNotifyDialog = $event" />
  </div>
</template>
