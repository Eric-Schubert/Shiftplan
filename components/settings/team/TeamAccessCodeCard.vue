<script setup lang="ts">
import { renderQrSvg } from "~/utils/qr-code";

// Active team code with QR code, direct link and the actions to change it.
const props = defineProps<{ code: string; generating: boolean }>();
const emit = defineEmits<{
  (e: "generate"): void;
  (e: "remove"): void;
  (e: "error", message: string): void;
}>();

const copied = ref(false);
const qrSvg = ref("");
const { t } = useI18n();

const accessLink = computed(() =>
  import.meta.client ? `${window.location.origin}/?zugang=${encodeURIComponent(props.code)}` : ""
);

watch(
  accessLink,
  async (link) => {
    qrSvg.value = link ? await renderQrSvg(link) : "";
  },
  { immediate: true }
);

async function copyLink() {
  try {
    await navigator.clipboard.writeText(accessLink.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    emit("error", t("settings.team.card.copyFailed"));
  }
}
</script>

<template>
  <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
    <div
      class="h-44 w-44 flex-shrink-0 rounded-xl border border-[var(--border-soft)] bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
      role="img"
      :aria-label="t('settings.team.card.qrLabel', { link: accessLink })"
      v-html="qrSvg"
    ></div>

    <div class="min-w-0 space-y-3">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">{{ t("app.teamAccess.code") }}</p>
        <p class="font-mono text-2xl font-semibold tracking-wider text-[var(--text-1)]">{{ code }}</p>
      </div>
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">{{ t("settings.team.card.link") }}</p>
        <p class="break-all font-mono text-sm text-[var(--text-2)]">{{ accessLink }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <PrimeButton
          :label="copied ? t('settings.team.card.copied') : t('settings.team.card.copy')"
          :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
          size="small"
          class="min-h-9"
          @click="copyLink"
        />
        <PrimeButton
          :label="t('settings.team.card.generate')"
          icon="pi pi-refresh"
          severity="secondary"
          size="small"
          outlined
          class="min-h-9"
          :loading="generating"
          @click="emit('generate')"
        />
        <PrimeButton
          :label="t('settings.team.card.remove')"
          icon="pi pi-lock-open"
          severity="danger"
          size="small"
          outlined
          class="min-h-9"
          @click="emit('remove')"
        />
      </div>
    </div>
  </div>
</template>
