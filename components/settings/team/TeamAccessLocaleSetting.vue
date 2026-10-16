<script setup lang="ts">
import { isAppLocale, LOCALE_NAMES, LOCALE_TAGS, LOCALES, type AppLocale } from "~/i18n/config";

// Admin setting: the instance's language for everyone without a language of their own.
const emit = defineEmits<{ (e: "error", message: string): void }>();
const locale = defineModel<AppLocale>({ required: true });

const { authFetch } = useAuthFetch();
const saving = ref(false);
const { t } = useI18n();
const requestError = useRequestError();
const options = LOCALES.map((code) => ({ code, name: LOCALE_NAMES[code], tag: LOCALE_TAGS[code] }));

async function save(value: unknown) {
  if (!isAppLocale(value) || value === locale.value) return;
  const previous = locale.value;
  locale.value = value;
  saving.value = true;
  emit("error", "");
  try {
    const result = await authFetch<{ instanceLocale: AppLocale }>("/api/team-access", {
      method: "POST",
      body: { instanceLocale: value },
    });
    locale.value = result.instanceLocale;
  } catch (cause) {
    emit("error", requestError(cause, "settings.settingFailed"));
    locale.value = previous;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-[46rem] space-y-1.5">
    <label for="team-instance-locale" class="block text-sm font-medium text-[var(--text-2)]">
      {{ t("settings.team.locale.label") }}
    </label>
    <PrimeSelect
      :model-value="locale"
      input-id="team-instance-locale"
      :options="options"
      option-label="name"
      option-value="code"
      class="w-full max-w-xs"
      :disabled="saving"
      @update:model-value="save"
    >
      <template #option="{ option }">
        <span :lang="option.tag">{{ option.name }}</span>
      </template>
    </PrimeSelect>
    <p class="text-sm text-[var(--text-2)]">{{ t("settings.team.locale.hint") }}</p>
  </div>
</template>
