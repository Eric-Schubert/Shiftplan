import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from "vue";
import type { Absence } from "~/types/absence";
import type { WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import { useAppStore } from "~/stores/app.store";
import { useDataStore } from "~/stores/data.store";
import { assignmentsReplacedByFill, planShowsWeek } from "~/utils/plan-week";

/** What the plan page loaded for the selected week; the plan and the absences come from its `useFetch` calls. */
export interface PlannerWeekSource {
  shiftplan: Ref<WeeklyShiftplanWithPattern | null>;
  pending: Ref<boolean>;
  absences: Ref<Absence[]>;
  refresh: () => Promise<unknown>;
  refreshAbsences: () => Promise<unknown>;
}

/** The selected week's plan, shared with everything under the plan page instead of passing events up three levels. */
export interface PlannerWeek {
  shiftplan: Ref<WeeklyShiftplanWithPattern | null>;
  absences: Ref<Absence[]>;
  year: ComputedRef<number>;
  week: ComputedRef<number>;
  /** The skeleton only covers a week whose plan is not there yet, not a reload after a change. */
  showSkeleton: ComputedRef<boolean>;
  generating: Ref<boolean>;
  /** The fill confirmation (F006) is open. */
  confirmFill: Ref<boolean>;
  /** Counts saved changes, so the preview of the next weeks reloads with the plan. */
  planRevision: Ref<number>;
  /** Unknown (null) while the selected week's plan loads or failed: the hero button waits, any other trigger asks. */
  replacedByFill: ComputedRef<number | null>;
  fillReady: ComputedRef<boolean>;
  /** Reloads plan and absences after a change. */
  refreshWeek: () => Promise<void>;
  /** Fills the week from the pattern at once when that loses nothing, otherwise asks first. */
  requestFill: () => void;
  generateFromPattern: () => Promise<void>;
}

const plannerWeekKey: InjectionKey<PlannerWeek> = Symbol("planner-week");

export function createPlannerWeek(source: PlannerWeekSource): PlannerWeek {
  const appStore = useAppStore();
  const dataStore = useDataStore();
  const { authFetch } = useAuthFetch();
  const { notify } = useErrorNotices();

  const year = computed(() => appStore.selectedYear);
  const week = computed(() => appStore.selectedWeek);
  const generating = ref(false);
  const confirmFill = ref(false);
  const planRevision = ref(0);
  const showSkeleton = computed(() => source.pending.value && !planShowsWeek(source.shiftplan.value, year.value, week.value));
  const replacedByFill = computed(() =>
    assignmentsReplacedByFill(source.shiftplan.value, dataStore.rotationPattern, {
      year: year.value,
      week: week.value,
      loading: source.pending.value,
    })
  );
  const fillReady = computed(() => replacedByFill.value !== null);

  async function refreshWeek() {
    await Promise.all([source.refresh(), source.refreshAbsences()]);
    planRevision.value++;
  }

  function requestFill() {
    if (replacedByFill.value === 0) void generateFromPattern();
    else confirmFill.value = true;
  }

  async function generateFromPattern() {
    generating.value = true;
    try {
      await authFetch("/api/shiftplan/generate", { method: "POST", body: { year: year.value, week: week.value } });
    } catch (error) {
      notify(error, "planner.week.fill.failed");
    }
    confirmFill.value = false;
    await refreshWeek();
    generating.value = false;
  }

  return {
    shiftplan: source.shiftplan,
    absences: source.absences,
    year,
    week,
    showSkeleton,
    generating,
    confirmFill,
    planRevision,
    replacedByFill,
    fillReady,
    refreshWeek,
    requestFill,
    generateFromPattern,
  };
}

/** Called once by the plan page; everything rendered under it reaches the week with `usePlannerWeek()`. */
export function providePlannerWeek(source: PlannerWeekSource): PlannerWeek {
  const plannerWeek = createPlannerWeek(source);
  provide(plannerWeekKey, plannerWeek);
  return plannerWeek;
}

export function usePlannerWeek(): PlannerWeek {
  const plannerWeek = inject(plannerWeekKey, null);
  if (!plannerWeek) throw new Error("usePlannerWeek() works only under the plan page");
  return plannerWeek;
}
