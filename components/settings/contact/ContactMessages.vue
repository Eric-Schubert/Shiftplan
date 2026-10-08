<script setup lang="ts">
import type { ContactMessage, ContactMessagesResponse } from "~/types/contact";

const { authFetch } = useAuthFetch();
const messages = ref<ContactMessage[]>([]);
const total = ref(0);
const loading = ref(true);
const updatingId = ref<number | null>(null);
const page = ref(0);
const limit = 10;

const totalPages = computed(() => Math.ceil(total.value / limit));

async function fetchMessages() {
  loading.value = true;
  try {
    const result = await $fetch<ContactMessagesResponse>("/api/contact/messages", {
      query: { limit, offset: page.value * limit },
    });
    messages.value = result.messages;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

async function markRead(message: ContactMessage) {
  if (message.read_at || updatingId.value) return;

  updatingId.value = message.contact_id;
  try {
    const updated = await authFetch<ContactMessage>(
      `/api/contact/messages/${message.contact_id}`,
      { method: "PATCH" }
    );
    messages.value = messages.value.map((item) =>
      item.contact_id === updated.contact_id ? updated : item
    );
  } finally {
    updatingId.value = null;
  }
}

function prevPage() {
  if (page.value > 0) {
    page.value--;
    void fetchMessages();
  }
}

function nextPage() {
  if (page.value < totalPages.value - 1) {
    page.value++;
    void fetchMessages();
  }
}

onMounted(fetchMessages);
</script>

<template>
  <div>
    <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm leading-6 text-[var(--text-2)]">
        Eingegangene Nachrichten aus dem öffentlichen Kontaktformular.
      </p>
      <PrimeButton
        icon="pi pi-refresh"
        label="Aktualisieren"
        severity="secondary"
        outlined
        class="min-h-11"
        :loading="loading"
        @click="fetchMessages"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <PrimeProgressSpinner />
    </div>

    <template v-else>
      <div v-if="messages.length > 0" class="space-y-3">
        <ContactMessageCard
          v-for="message in messages"
          :key="message.contact_id"
          :message="message"
          :updating="updatingId === message.contact_id"
          @mark-read="markRead(message)"
        />
      </div>

      <div v-else class="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--text-3)]">
        Noch keine Kontaktanfragen vorhanden.
      </div>

      <SettingsPager
        v-if="totalPages > 1"
        :page="page"
        :total-pages="totalPages"
        class="border-[var(--border-soft)]"
        @prev="prevPage"
        @next="nextPage"
      >
        <span class="text-sm text-[var(--text-2)]">
          Seite {{ page + 1 }} von {{ totalPages }} ({{ total }} Nachrichten)
        </span>
      </SettingsPager>
    </template>
  </div>
</template>
