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
        <AuditLogEntry v-for="entry in entries" :key="entry.audit_id" :entry="entry" />
      </div>

      <div v-else class="text-center py-8 text-gray-400">
        Noch keine Änderungen protokolliert
      </div>

      <SettingsPager
        v-if="totalPages > 1"
        :page="page"
        :total-pages="totalPages"
        class="dark:border-gray-700"
        @prev="prevPage"
        @next="nextPage"
      >
        <span class="text-sm text-gray-500">
          Seite {{ page + 1 }} von {{ totalPages }} ({{ total }} Einträge)
        </span>
      </SettingsPager>
    </template>
  </div>
</template>
