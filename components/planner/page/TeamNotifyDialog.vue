<script setup lang="ts">
const MAX_LENGTH = 240;

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const { authFetch } = useAuthFetch();
const message = ref("");
const subscriberCount = ref<number | null>(null);
const sending = ref(false);
const error = ref("");
const result = ref("");

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return;
    error.value = "";
    result.value = "";
    try {
      const status = await authFetch<{ subscriberCount: number }>("/api/push/status");
      subscriberCount.value = status.subscriberCount;
    } catch {
      subscriberCount.value = null;
    }
  },
  { immediate: true }
);

async function send() {
  if (!message.value.trim()) {
    error.value = "Bitte eine Nachricht eingeben";
    return;
  }

  sending.value = true;
  error.value = "";
  try {
    const response = await authFetch<{ sent: number; failed: number }>("/api/push/notify", {
      method: "POST",
      body: { message: message.value },
    });
    result.value =
      response.sent === 1 ? "An 1 Gerät gesendet." : `An ${response.sent} Geräte gesendet.`;
    message.value = "";
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Nachricht konnte nicht gesendet werden";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Team benachrichtigen"
    modal
    :style="{ width: '30rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-3 text-sm text-[var(--text-2)]">
      <p v-if="subscriberCount !== null">
        <template v-if="subscriberCount === 0">
          Noch hat niemand Benachrichtigungen aktiviert.
        </template>
        <template v-else>
          Geht als Push an {{ subscriberCount === 1 ? "1 Gerät" : `${subscriberCount} Geräte` }}.
        </template>
      </p>

      <div class="space-y-1.5">
        <label for="team-notify-message" class="block font-medium">Nachricht</label>
        <PrimeTextarea
          id="team-notify-message"
          v-model="message"
          rows="3"
          :maxlength="MAX_LENGTH"
          class="w-full"
          placeholder="z. B. Wer kann Samstag die Frühschicht übernehmen?"
          :disabled="sending"
        />
        <div class="flex justify-between gap-3 text-xs text-[var(--text-3)]">
          <span>Keine Krankheitsgründe oder andere Gesundheitsdaten nennen.</span>
          <span class="tabular-nums">{{ message.length }}/{{ MAX_LENGTH }}</span>
        </div>
      </div>

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
      <p v-if="result" class="flex items-center gap-2 font-medium text-[var(--text-1)]" role="status">
        <i class="pi pi-check" aria-hidden="true"></i>
        {{ result }}
      </p>
    </div>

    <template #footer>
      <PrimeButton label="Schließen" text @click="dialogVisible = false" />
      <PrimeButton
        label="Senden"
        icon="pi pi-send"
        class="min-h-11"
        :loading="sending"
        :disabled="subscriberCount === 0"
        @click="send"
      />
    </template>
  </PrimeDialog>
</template>
