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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "Z");
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
        class="min-h-11 !rounded-full"
        :loading="loading"
        @click="fetchMessages"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <PrimeProgressSpinner />
    </div>

    <template v-else>
      <div v-if="messages.length > 0" class="space-y-3">
        <article
          v-for="message in messages"
          :key="message.contact_id"
          class="planner-panel !rounded-[18px] !p-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="truncate text-base font-semibold text-[var(--text-1)]">
                  {{ message.subject || "Kontaktanfrage" }}
                </h4>
                <PrimeTag
                  :value="message.read_at ? 'Gelesen' : 'Neu'"
                  :severity="message.read_at ? 'secondary' : 'success'"
                  class="text-xs"
                />
              </div>

              <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-3)]">
                <span>{{ message.name }}</span>
                <span aria-hidden="true">|</span>
                <span>{{ formatDate(message.created_at) }}</span>
              </div>
            </div>

            <PrimeButton
              v-if="!message.read_at"
              label="Als gelesen markieren"
              icon="pi pi-check"
              severity="secondary"
              outlined
              class="min-h-10 !rounded-full"
              :loading="updatingId === message.contact_id"
              @click="markRead(message)"
            />
          </div>

          <dl class="mt-4 grid gap-3 text-sm">
            <div class="grid gap-1">
              <dt class="font-semibold text-[var(--text-1)]">Rückkontakt</dt>
              <dd class="break-words text-[var(--text-2)]">{{ message.reply_to }}</dd>
            </div>
            <div class="grid gap-1">
              <dt class="font-semibold text-[var(--text-1)]">Nachricht</dt>
              <dd class="whitespace-pre-wrap break-words leading-6 text-[var(--text-2)]">
                {{ message.message }}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <div v-else class="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--text-3)]">
        Noch keine Kontaktanfragen vorhanden.
      </div>

      <div
        v-if="totalPages > 1"
        class="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-4"
      >
        <PrimeButton
          icon="pi pi-chevron-left"
          text
          class="!h-11 !w-11"
          aria-label="Vorherige Seite"
          :disabled="page === 0"
          @click="prevPage"
        />
        <span class="text-sm text-[var(--text-2)]">
          Seite {{ page + 1 }} von {{ totalPages }} ({{ total }} Nachrichten)
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
