<script setup lang="ts">
import type { WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import type { Absence } from "~/types/absence";
import type { MemberProfile } from "~/composables/useMember";
import { useSwipe } from "~/composables/useSwipe";

defineProps<{
  shiftplan: WeeklyShiftplanWithPattern | null | undefined;
  pending: boolean;
  absences: Absence[];
  member: MemberProfile | null;
  generating: boolean;
}>();

const emit = defineEmits<{
  (e: "updated"): void;
  (e: "generate"): void;
  /** Weeks were rolled out in the bulk dialog. */
  (e: "generated"): void;
}>();

const appStore = useAppStore();
const authStore = useAuthStore();

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
  isSwiping.value
    ? { transform: `translateX(${swipeOffset.value}px)`, opacity: 1 - Math.abs(swipeOffset.value) / 200 }
    : {}
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
      :formatted-week-range="appStore.formattedWeekRange"
      :pattern-week="shiftplan?.pattern_week"
      :can-edit-shifts="authStore.canEditShifts"
      :generating="generating"
      @previous="appStore.previousWeek"
      @today="appStore.goToCurrentWeek"
      @next="appStore.nextWeek"
      @jump="jumpWeeks"
      @generate="emit('generate')"
      @open-bulk="showBulkDialog = true"
      @notify-team="showNotifyDialog = true"
    />

    <PushPromptCard v-if="!authStore.canEditShifts" />

    <MemberPanel v-if="member" :member="member" @updated="emit('updated')" />

    <PlannerWeekBoard
      :shiftplan="shiftplan"
      :pending="pending"
      :absences="absences"
      :my-staff-id="member?.id ?? null"
      :swipe-class="contentSlideClass"
      :swipe-style="contentSlideStyle"
      @updated="emit('updated')"
      @generate="emit('generate')"
    />

    <slot />

    <LazyPlannerBulkGenerateDialog
      v-if="showBulkDialog"
      :visible="showBulkDialog"
      :year="appStore.selectedYear"
      :week="appStore.selectedWeek"
      @update:visible="showBulkDialog = $event"
      @generated="emit('generated')"
    />

    <LazyTeamNotifyDialog
      v-if="showNotifyDialog"
      :visible="showNotifyDialog"
      @update:visible="showNotifyDialog = $event"
    />
  </div>
</template>
