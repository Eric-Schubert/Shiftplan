<script setup lang="ts">
import type { Shift } from "~/types/shift";

defineProps<{
  shifts: Shift[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "edit", shift: Shift): void;
  (e: "toggle-active", shift: Shift): void;
  (e: "delete", shift: Shift): void;
}>();
const { t } = useI18n();
</script>

<template>
  <div>
    <div class="space-y-3 sm:hidden">
      <div
        v-for="shift in shifts"
        :key="shift.shift_id"
        class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: shift.color }" />
              <p class="text-sm font-semibold text-gray-900 dark:text-white" :class="{ 'opacity-50': !shift.active }">
                {{ shift.name }}
              </p>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              {{ t("settings.shifts.timeRange", { start: shift.start_time, end: shift.end_time }) }}
            </p>
            <div class="flex flex-wrap gap-2">
              <PrimeTag :value="t('settings.shifts.minStaffTag', { count: shift.min_staff })" severity="secondary" />
              <PrimeTag :value="shift.active ? t('settings.list.active') : t('settings.list.inactive')" :severity="shift.active ? 'success' : 'danger'" />
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <PrimeButton :label="t('common.actions.edit')" severity="secondary" outlined class="min-h-10" @click="emit('edit', shift)" />
            <PrimeButton
              :label="shift.active ? t('common.actions.deactivate') : t('common.actions.activate')"
              severity="secondary"
              outlined
              class="min-h-10"
              @click="emit('toggle-active', shift)"
            />
            <PrimeButton :label="t('common.actions.delete')" severity="danger" outlined class="min-h-10" @click="emit('delete', shift)" />
          </div>
        </div>
      </div>
    </div>

    <div class="hidden sm:block">
      <PrimeDataTable :value="shifts" striped-rows :loading="loading">
        <PrimeColumn header="" style="width: 40px">
          <template #body="{ data }">
            <div class="h-4 w-4 rounded-full" :style="{ backgroundColor: data.color }" />
          </template>
        </PrimeColumn>

        <PrimeColumn field="name" :header="t('validation.fields.name')" sortable>
          <template #body="{ data }">
            <span :class="{ 'opacity-50': !data.active }">{{ data.name }}</span>
          </template>
        </PrimeColumn>

        <PrimeColumn :header="t('settings.shifts.time')">
          <template #body="{ data }">{{ t("settings.shifts.timeRange", { start: data.start_time, end: data.end_time }) }}</template>
        </PrimeColumn>

        <PrimeColumn field="min_staff" :header="t('settings.shifts.minStaffShort')" sortable />

        <PrimeColumn field="active" :header="t('settings.list.status')" sortable>
          <template #body="{ data }">
            <PrimeTag :value="data.active ? t('settings.list.active') : t('settings.list.inactive')" :severity="data.active ? 'success' : 'danger'" />
          </template>
        </PrimeColumn>

        <PrimeColumn :header="t('settings.list.actions')" style="width: 180px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <PrimeButton icon="pi pi-pencil" text rounded class="!h-10 !w-10" :aria-label="t('settings.shifts.edit')" @click="emit('edit', data)" />
              <PrimeButton
                :icon="data.active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                text
                rounded
                class="!h-10 !w-10"
                :aria-label="data.active ? t('settings.shifts.deactivate') : t('settings.shifts.activate')"
                @click="emit('toggle-active', data)"
              />
              <PrimeButton
                icon="pi pi-trash"
                text
                rounded
                class="!h-10 !w-10"
                severity="danger"
                :aria-label="t('settings.shifts.delete')"
                @click="emit('delete', data)"
              />
            </div>
          </template>
        </PrimeColumn>
      </PrimeDataTable>
    </div>
  </div>
</template>
