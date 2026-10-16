<script setup lang="ts">
import type { ContactMessage } from "~/types/contact";
import { formatSqlTimestamp } from "~/utils/timestamp";

// One message from the public contact form.
defineProps<{ message: ContactMessage; updating: boolean }>();
const emit = defineEmits<{ (e: "mark-read"): void }>();
const localeTag = useLocaleTag();
const { t } = useI18n();
</script>

<template>
  <article class="planner-panel !rounded-lg !p-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h4 class="truncate text-base font-semibold text-[var(--text-1)]">
            {{ message.subject || t("validation.fields.contactMessage") }}
          </h4>
          <PrimeTag
            :value="message.read_at ? t('settings.contact.read') : t('settings.contact.new')"
            :severity="message.read_at ? 'secondary' : 'success'"
            class="text-xs"
          />
        </div>

        <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-3)]">
          <span>{{ message.name }}</span>
          <span aria-hidden="true">|</span>
          <span>{{ formatSqlTimestamp(localeTag, message.created_at) }}</span>
        </div>
      </div>

      <PrimeButton
        v-if="!message.read_at"
        :label="t('settings.contact.markRead')"
        icon="pi pi-check"
        severity="secondary"
        outlined
        class="min-h-10"
        :loading="updating"
        @click="emit('mark-read')"
      />
    </div>

    <dl class="mt-4 grid gap-3 text-sm">
      <div class="grid gap-1">
        <dt class="font-semibold text-[var(--text-1)]">{{ t("validation.fields.replyTo") }}</dt>
        <dd class="break-words text-[var(--text-2)]">{{ message.reply_to }}</dd>
      </div>
      <div class="grid gap-1">
        <dt class="font-semibold text-[var(--text-1)]">{{ t("validation.fields.message") }}</dt>
        <dd class="whitespace-pre-wrap break-words leading-6 text-[var(--text-2)]">
          {{ message.message }}
        </dd>
      </div>
    </dl>
  </article>
</template>
