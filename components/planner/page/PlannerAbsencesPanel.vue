<script setup lang="ts">
import { formatDay, formatDayRange } from "~/shared/utils/format/day";
import { collator } from "~/shared/utils/format/number";
import { ABSENCE_REASON_KEYS, type Absence } from "~/types/absence";

const props = defineProps<{
  absences: Absence[];
  canEdit: boolean;
  /** Signed-in staff member, who may withdraw their own absences. */
  myStaffId?: number | null;
  year: number;
  week: number;
}>();

const emit = defineEmits<{
  (e: "updated"): void;
}>();

const { authFetch } = useAuthFetch();
const localeTag = useLocaleTag();
const { t } = useI18n();
const showDialog = ref(false);
const removing = ref<number | null>(null);
const toRemove = ref<Absence | null>(null);
const error = ref("");

// Days entered as one range show up as a single row.
const sorted = computed(() => {
  const seen = new Set<string>();
  return [...props.absences]
    .sort((a, b) => a.absence_date.localeCompare(b.absence_date) || collator(localeTag.value).compare(a.staff_name, b.staff_name))
    .filter((absence) => {
      if (!absence.batch_id) return true;
      if (seen.has(absence.batch_id)) return false;
      seen.add(absence.batch_id);
      return true;
    });
});

// Staff can withdraw their own absences only while days are still ahead.
function canRemove(absence: Absence): boolean {
  if (props.canEdit) return true;
  return props.myStaffId != null && absence.staff_id === props.myStaffId && absence.range_to >= todayISO();
}

function isRange(absence: Absence): boolean {
  return absence.range_from !== absence.range_to;
}

async function remove(absence: Absence) {
  removing.value = absence.absence_id;
  error.value = "";
  try {
    const query = isRange(absence) ? "?range=1" : "";
    if (props.canEdit) {
      await authFetch(`/api/absences/${absence.absence_id}${query}`, { method: "DELETE" });
    } else {
      await $fetch(`/api/member/absences/${absence.absence_id}${query}`, { method: "DELETE" });
    }
    emit("updated");
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || t("absence.remove.failed");
  } finally {
    removing.value = null;
    toRemove.value = null;
  }
}
</script>

<template>
  <div v-if="absences.length > 0 || canEdit" class="mt-4">
    <div class="planner-section-heading !mb-2">
      <h3 class="text-sm font-semibold text-[var(--text-1)]">{{ t("absence.panel.title") }}</h3>
      <PrimeButton
        v-if="canEdit"
        :label="t('absence.add')"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        outlined
        class="min-h-8"
        @click="showDialog = true"
      />
    </div>

    <p v-if="sorted.length === 0" class="text-sm text-[var(--text-3)]">{{ t("absence.panel.empty") }}</p>

    <ul v-else class="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]">
      <li v-for="absence in sorted" :key="absence.absence_id" class="flex items-center gap-3 px-4 py-2.5 text-sm">
        <span
          class="flex-shrink-0 font-semibold tabular-nums text-[var(--text-1)]"
          :class="isRange(absence) ? 'w-40' : 'w-20'"
        >
          {{ isRange(absence) ? formatDayRange(localeTag, absence.range_from, absence.range_to) : formatDay(localeTag, absence.absence_date) }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="font-medium text-[var(--text-1)]">{{ absence.staff_name }}</span>
          <!-- The leading spaces separate the parts; Vue drops a bare space at the start of an element. -->
          <span class="text-[var(--text-2)]">{{ " " + t("absence.panel.isOut") }}</span>
          <span v-if="absence.shift_name && !isRange(absence)" class="text-[var(--text-2)]">{{ " " + t("absence.panel.shiftOpen", { shift: absence.shift_name }) }}</span>
          <span v-if="absence.reason" class="ml-1 text-[var(--text-3)]">· {{ t(ABSENCE_REASON_KEYS[absence.reason]) }}</span>
          <span v-if="absence.note" class="ml-1 italic text-[var(--text-3)]">· {{ absence.note }}</span>
        </span>
        <span v-if="absence.source === 'app'" class="planner-chip !py-0 text-[0.6875rem]">{{ t("absence.panel.viaApp") }}</span>
        <button
          v-if="canRemove(absence)"
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-3)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-ink)] disabled:opacity-50"
          :aria-label="t(isRange(absence) ? 'absence.panel.removeRange' : 'absence.panel.removeDay', { name: absence.staff_name })"
          :disabled="removing === absence.absence_id"
          @click="toRemove = absence"
        >
          <i class="pi pi-times text-[0.7rem]" aria-hidden="true"></i>
        </button>
      </li>
    </ul>

    <small v-if="error" class="mt-2 block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>

    <AbsenceRemoveDialog v-model:absence="toRemove" :removing="removing !== null" @confirm="remove" />

    <LazyAbsenceDialog
      v-if="showDialog"
      :visible="showDialog"
      :year="year"
      :week="week"
      @update:visible="showDialog = $event"
      @created="emit('updated')"
    />
  </div>
</template>
