<script setup lang="ts">
import type { RotationAssignContext } from "~/types/rotation";
import type { Staff } from "~/types/staff";

const props = defineProps<{
  visible: boolean;
  context: RotationAssignContext | null;
  availableStaff: Staff[];
  assigning: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "assign", staffId: number): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const { t } = useI18n();
const dialogHeader = computed(() => {
  if (!props.context) return t("settings.rotation.assign.header");
  return t("settings.rotation.assign.headerFor", { shift: props.context.shiftName, week: props.context.patternWeek });
});
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="dialogHeader"
    modal
    :style="{ width: '25rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-2">
      <p v-if="availableStaff.length === 0" class="text-gray-500 dark:text-gray-400">
        {{ t("settings.rotation.assign.allAssigned") }}
      </p>

      <button
        v-for="staff in availableStaff"
        :key="staff.staff_id"
        type="button"
        class="flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        :disabled="assigning"
        @click="emit('assign', staff.staff_id)"
      >
        <span class="text-gray-900 dark:text-white">{{ staff.name }}</span>
        <PrimeTag
          v-if="staff.is_parttime"
          :value="t('settings.staff.partTime')"
          severity="secondary"
          class="text-xs"
        />
      </button>
    </div>
  </PrimeDialog>
</template>
