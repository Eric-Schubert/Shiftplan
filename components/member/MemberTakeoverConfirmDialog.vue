<script setup lang="ts">
import type { ShiftRequest } from "~/types/shift-request";
import { formatRequestPeriod } from "~/utils/request-period";

// Taking over a shift also signs the member out of their own shift that day.
defineProps<{ busy: boolean }>();
const emit = defineEmits<{ (e: "confirm", request: ShiftRequest): void }>();
const request = defineModel<ShiftRequest | null>("request");
const localeTag = useLocaleTag();
</script>

<template>
  <PrimeDialog
    :visible="request != null"
    :header="$t('requests.takeoverConfirm.header')"
    modal
    :style="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    @update:visible="!$event && (request = null)"
  >
    <p v-if="request" class="text-sm text-[var(--text-2)]">
      {{
        $t("requests.takeoverConfirm.text", {
          shift: request.shift_name ?? "",
          period: formatRequestPeriod(localeTag, request),
          name: request.requester_name,
        })
      }}
    </p>
    <template #footer>
      <PrimeButton :label="$t('common.actions.cancel')" text @click="request = null" />
      <PrimeButton
        :label="$t('requests.list.take')"
        icon="pi pi-check"
        :loading="busy"
        @click="request && emit('confirm', request)"
      />
    </template>
  </PrimeDialog>
</template>
