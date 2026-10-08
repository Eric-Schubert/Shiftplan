<script setup lang="ts">
import type { AuditEntry } from "~/types/auth";
import { formatSqlTimestamp } from "~/utils/timestamp";

const ACTIONS: Record<string, { label: string; icon: string; color: string; severity: string; separator: string }> = {
  assign: { label: "Zugewiesen", icon: "mdi:account-plus", color: "text-green-600 dark:text-green-400", severity: "success", separator: " → " },
  unassign: { label: "Entfernt", icon: "mdi:account-minus", color: "text-red-600 dark:text-red-400", severity: "danger", separator: " ✕ " },
  day_add: { label: "Für einen Tag eingeteilt", icon: "mdi:calendar-plus", color: "text-green-600 dark:text-green-400", severity: "success", separator: " → " },
  day_remove: { label: "Für einen Tag ausgetragen", icon: "mdi:calendar-remove", color: "text-red-600 dark:text-red-400", severity: "danger", separator: " ✕ " },
  absence: { label: "Ausfall gemeldet", icon: "mdi:account-cancel", color: "text-amber-600 dark:text-amber-400", severity: "warn", separator: " fällt aus · " },
  absence_cancel: { label: "Ausfall zurückgezogen", icon: "mdi:account-check", color: "text-gray-500 dark:text-gray-400", severity: "secondary", separator: " wieder da · " },
  generate: { label: "Aus Muster ausgerollt", icon: "mdi:calendar-sync", color: "text-blue-600 dark:text-blue-400", severity: "info", separator: "" },
  pattern_import: { label: "Muster importiert", icon: "mdi:file-excel", color: "text-blue-600 dark:text-blue-400", severity: "info", separator: "" },
};

const props = defineProps<{ entry: AuditEntry }>();

const info = computed(() => ACTIONS[props.entry.action] ?? ACTIONS.unassign!);
/** Rollouts and imports touch many people at once; their summary sits in the reason. */
const isBulk = computed(() => !props.entry.staff_name && !props.entry.shift_name);
</script>

<template>
  <div class="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 px-4 py-3">
    <Icon
      :name="info.icon"
      class="text-lg mt-0.5 flex-shrink-0"
      :class="info.color"
    />

    <div class="flex-1 min-w-0">
      <div v-if="isBulk" class="text-sm text-gray-900 dark:text-white">
        <span class="font-medium">{{ entry.reason }}</span>
        <span class="text-gray-500 dark:text-gray-400">
          · ab KW {{ entry.week_number }}/{{ entry.year }}
        </span>
      </div>
      <div v-else class="text-sm text-gray-900 dark:text-white">
        <span class="font-medium">{{ entry.staff_name }}</span>
        <span class="text-gray-500 dark:text-gray-400">
          {{ info.separator }}
        </span>
        <span class="font-medium">{{ entry.shift_name }}</span>
        <span class="text-gray-500 dark:text-gray-400">
          · KW {{ entry.week_number }}/{{ entry.year }}
        </span>
      </div>

      <div class="flex items-center gap-2 mt-1 text-xs text-gray-400">
        <span>{{ entry.username }}</span>
        <template v-if="entry.source === 'app'">
          <span>·</span>
          <span>über App</span>
        </template>
        <span>·</span>
        <span>{{ formatSqlTimestamp(entry.created_at) }}</span>
        <template v-if="entry.reason && !isBulk">
          <span>·</span>
          <span class="italic">{{ entry.reason }}</span>
        </template>
      </div>
    </div>

    <PrimeTag
      :value="info.label"
      :severity="info.severity"
      class="text-xs flex-shrink-0"
    />
  </div>
</template>
