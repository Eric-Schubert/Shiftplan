<script setup lang="ts">
import type { AuditEntry } from "~/types/auth";

const entries = ref<AuditEntry[]>([]);
const total = ref(0);
const loading = ref(true);
const page = ref(0);
const limit = 20;

async function fetchEntries() {
  loading.value = true;
  try {
    const result = await $fetch<{ entries: AuditEntry[]; total: number }>("/api/audit", {
      query: { limit, offset: page.value * limit },
    });
    entries.value = result.entries;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "Z");
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTIONS: Record<string, { label: string; icon: string; color: string; severity: string; separator: string }> = {
  assign: { label: "Zugewiesen", icon: "mdi:account-plus", color: "text-green-600 dark:text-green-400", severity: "success", separator: " → " },
  unassign: { label: "Entfernt", icon: "mdi:account-minus", color: "text-red-600 dark:text-red-400", severity: "danger", separator: " ✕ " },
  day_add: { label: "Für einen Tag eingeteilt", icon: "mdi:calendar-plus", color: "text-green-600 dark:text-green-400", severity: "success", separator: " → " },
  day_remove: { label: "Für einen Tag ausgetragen", icon: "mdi:calendar-remove", color: "text-red-600 dark:text-red-400", severity: "danger", separator: " ✕ " },
  absence: { label: "Ausfall gemeldet", icon: "mdi:account-cancel", color: "text-amber-600 dark:text-amber-400", severity: "warn", separator: " fällt aus · " },
  absence_cancel: { label: "Ausfall zurückgezogen", icon: "mdi:account-check", color: "text-gray-500 dark:text-gray-400", severity: "secondary", separator: " wieder da · " },
};

function actionInfo(action: string) {
  return ACTIONS[action] ?? ACTIONS.unassign!;
}

const totalPages = computed(() => Math.ceil(total.value / limit));

function prevPage() {
  if (page.value > 0) {
    page.value--;
    fetchEntries();
  }
}

function nextPage() {
  if (page.value < totalPages.value - 1) {
    page.value++;
    fetchEntries();
  }
}

onMounted(fetchEntries);
</script>

<template>
  <div>
    <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">
      Alle manuellen Änderungen am Schichtplan
    </p>


    <div v-if="loading" class="flex justify-center py-8">
      <PrimeProgressSpinner />
    </div>

    <template v-else>

      <div v-if="entries.length > 0" class="space-y-2">
        <div
          v-for="entry in entries"
          :key="entry.audit_id"
          class="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 px-4 py-3"
        >
          <Icon
            :name="actionInfo(entry.action).icon"
            class="text-lg mt-0.5 flex-shrink-0"
            :class="actionInfo(entry.action).color"
          />

          <div class="flex-1 min-w-0">
            <div class="text-sm text-gray-900 dark:text-white">
              <span class="font-medium">{{ entry.staff_name }}</span>
              <span class="text-gray-500 dark:text-gray-400">
                {{ actionInfo(entry.action).separator }}
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
              <span>{{ formatDate(entry.created_at) }}</span>
              <template v-if="entry.reason">
                <span>·</span>
                <span class="italic">{{ entry.reason }}</span>
              </template>
            </div>
          </div>

          <PrimeTag
            :value="actionInfo(entry.action).label"
            :severity="actionInfo(entry.action).severity"
            class="text-xs flex-shrink-0"
          />
        </div>
      </div>

      <div v-else class="text-center py-8 text-gray-400">
        Noch keine Änderungen protokolliert
      </div>


      <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between gap-3 border-t pt-4 dark:border-gray-700">
        <PrimeButton
          icon="pi pi-chevron-left"
          text
          class="!h-11 !w-11"
          aria-label="Vorherige Seite"
          :disabled="page === 0"
          @click="prevPage"
        />
        <span class="text-sm text-gray-500">
          Seite {{ page + 1 }} von {{ totalPages }} ({{ total }} Einträge)
        </span>
        <PrimeButton
          icon="pi pi-chevron-right"
          text
          class="!h-11 !w-11"
          aria-label="Nächste Seite"
          :disabled="page >= totalPages - 1"
          @click="nextPage"
        />
      </div>
    </template>
  </div>
</template>
