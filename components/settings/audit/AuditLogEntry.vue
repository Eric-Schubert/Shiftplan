<script setup lang="ts">
import type { AuditAction, AuditEntry } from "~/types/auth";
import type { MessageKey } from "~/i18n/types";
import { entryReason, type Translate } from "~/i18n/audit-reason";
import { weekOfYearLabel } from "~/shared/utils/format/week";
import { formatSqlTimestamp } from "~/utils/timestamp";

type ActionStyle = { label: MessageKey; icon: string; color: string; severity: string; separator: MessageKey | null };

const ACTIONS = {
  assign: {
    label: "audit.action.assign",
    icon: "mdi:account-plus",
    color: "text-green-600 dark:text-green-400",
    severity: "success",
    separator: "audit.separator.added",
  },
  unassign: {
    label: "audit.action.unassign",
    icon: "mdi:account-minus",
    color: "text-red-600 dark:text-red-400",
    severity: "danger",
    separator: "audit.separator.removed",
  },
  day_add: {
    label: "audit.action.dayAdd",
    icon: "mdi:calendar-plus",
    color: "text-green-600 dark:text-green-400",
    severity: "success",
    separator: "audit.separator.added",
  },
  day_remove: {
    label: "audit.action.dayRemove",
    icon: "mdi:calendar-remove",
    color: "text-red-600 dark:text-red-400",
    severity: "danger",
    separator: "audit.separator.removed",
  },
  absence: {
    label: "audit.action.absence",
    icon: "mdi:account-cancel",
    color: "text-amber-600 dark:text-amber-400",
    severity: "warn",
    separator: "audit.separator.absent",
  },
  absence_cancel: {
    label: "audit.action.absenceCancel",
    icon: "mdi:account-check",
    color: "text-gray-500 dark:text-gray-400",
    severity: "secondary",
    separator: "audit.separator.back",
  },
  generate: { label: "audit.action.generate", icon: "mdi:calendar-sync", color: "text-blue-600 dark:text-blue-400", severity: "info", separator: null },
  pattern_import: {
    label: "audit.action.patternImport",
    icon: "mdi:file-excel",
    color: "text-blue-600 dark:text-blue-400",
    severity: "info",
    separator: null,
  },
} as const satisfies Record<AuditAction, ActionStyle>;

const props = defineProps<{ entry: AuditEntry }>();
const localeTag = useLocaleTag();
const { t, te } = useI18n();

const info = computed<ActionStyle>(() => ACTIONS[props.entry.action] ?? ACTIONS.unassign);
/** Rollouts and imports touch many people at once; their summary sits in the reason. */
const isBulk = computed(() => !props.entry.staff_name && !props.entry.shift_name && !props.entry.staff_id && !props.entry.shift_id);

// vue-i18n takes the plural count as its own argument; the server's t() reads it from `count`.
const translate: Translate = (key, params) => (typeof params.count === "number" ? t(key, params, params.count) : t(key, params));
const reason = computed(() => entryReason(props.entry, localeTag.value, translate, (key) => te(key)));

/** Deleted people and shifts keep their id but no name. */
function name(value: string | null, id: number | null): string {
  return value ?? (id ? t("audit.unknown") : "");
}
</script>

<template>
  <div class="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 px-4 py-3">
    <Icon :name="info.icon" class="text-lg mt-0.5 flex-shrink-0" :class="info.color" />

    <div class="flex-1 min-w-0">
      <div v-if="isBulk" class="text-sm text-gray-900 dark:text-white">
        <span class="font-medium">{{ reason }}</span>
        <span class="text-gray-500 dark:text-gray-400">
          · {{ t("audit.fromWeek", { week: weekOfYearLabel(localeTag, entry.year, entry.week_number) }) }}
        </span>
      </div>
      <div v-else class="text-sm text-gray-900 dark:text-white">
        <span class="font-medium">{{ name(entry.staff_name, entry.staff_id) }}</span>
        <span class="text-gray-500 dark:text-gray-400">
          {{ info.separator ? t(info.separator) : "" }}
        </span>
        <span class="font-medium">{{ name(entry.shift_name, entry.shift_id) }}</span>
        <span class="text-gray-500 dark:text-gray-400"> · {{ weekOfYearLabel(localeTag, entry.year, entry.week_number) }} </span>
      </div>

      <div class="flex items-center gap-2 mt-1 text-xs text-gray-400">
        <span>{{ entry.username }}</span>
        <template v-if="entry.source === 'app'">
          <span>·</span>
          <span>{{ t("audit.viaApp") }}</span>
        </template>
        <span>·</span>
        <span>{{ formatSqlTimestamp(localeTag, entry.created_at) }}</span>
        <template v-if="reason && !isBulk">
          <span>·</span>
          <span class="italic">{{ reason }}</span>
        </template>
      </div>
    </div>

    <PrimeTag :value="t(info.label)" :severity="info.severity" class="text-xs flex-shrink-0" />
  </div>
</template>
