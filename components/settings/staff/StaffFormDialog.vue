<script setup lang="ts">
import type { Staff, StaffCreateDTO } from "~/types/staff";

const props = defineProps<{
  visible: boolean;
  staff: Staff | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const dataStore = useDataStore();
const saving = ref(false);
const error = ref("");
const { t } = useI18n();
const requestError = useRequestError();
const form = ref<StaffCreateDTO>(createDefaultForm());

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const isEditing = computed(() => props.staff !== null);

watch(
  [() => props.visible, () => props.staff],
  ([isVisible, staff]) => {
    if (!isVisible) return;
    form.value = staff ? createEditForm(staff) : createDefaultForm();
    error.value = "";
  },
  { immediate: true }
);

function createDefaultForm(): StaffCreateDTO {
  return { name: "", active: 1, is_parttime: 0, short_code: "" };
}

function createEditForm(staff: Staff): StaffCreateDTO {
  return {
    name: staff.name,
    active: staff.active,
    is_parttime: staff.is_parttime,
    short_code: staff.short_code ?? "",
  };
}

async function saveStaff() {
  if (!form.value.name.trim()) return;

  saving.value = true;
  error.value = "";
  try {
    if (props.staff) {
      await dataStore.updateStaff(props.staff.staff_id, form.value);
    } else {
      await dataStore.createStaff(form.value);
    }

    dialogVisible.value = false;
  } catch (cause) {
    error.value = requestError(cause, "settings.staff.form.saveFailed");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="isEditing ? t('settings.staff.edit') : t('settings.staff.form.createHeader')"
    modal
    :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-4">
      <div class="flex flex-col gap-2">
        <label for="staff-name" class="font-medium">{{ t("validation.fields.name") }}</label>
        <PrimeInputText id="staff-name" v-model="form.name" :placeholder="t('settings.staff.form.namePlaceholder')" />
      </div>

      <div class="flex flex-col gap-2">
        <label for="staff-short-code" class="font-medium">{{ t("member.shortCode") }}</label>
        <PrimeInputText
          id="staff-short-code"
          v-model="form.short_code"
          maxlength="8"
          class="font-mono uppercase"
          :placeholder="isEditing ? '' : t('settings.staff.form.shortCodePlaceholder')"
        />
        <small class="text-xs text-[var(--text-3)]">{{ t("settings.staff.form.shortCodeHint") }}</small>
      </div>

      <div class="flex items-center gap-2">
        <PrimeCheckbox v-model="form.is_parttime" input-id="parttime" :binary="true" :true-value="1" :false-value="0" />
        <label for="parttime">{{ t("settings.staff.partTime") }}</label>
      </div>

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </div>

    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="dialogVisible = false" />
      <PrimeButton
        :label="isEditing ? t('common.actions.save') : t('common.actions.create')"
        :loading="saving"
        :disabled="!form.name.trim()"
        @click="saveStaff"
      />
    </template>
  </PrimeDialog>
</template>
