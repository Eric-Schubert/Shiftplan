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
              {{ shift.start_time }} - {{ shift.end_time }} Uhr
            </p>
            <div class="flex flex-wrap gap-2">
              <PrimeTag :value="`${shift.min_staff} Min. MA`" severity="secondary" />
              <PrimeTag
                :value="shift.active ? 'Aktiv' : 'Inaktiv'"
                :severity="shift.active ? 'success' : 'danger'"
              />
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <PrimeButton
              label="Bearbeiten"
              severity="secondary"
              outlined
              class="min-h-10"
              @click="emit('edit', shift)"
            />
            <PrimeButton
              :label="shift.active ? 'Deaktivieren' : 'Aktivieren'"
              severity="secondary"
              outlined
              class="min-h-10"
              @click="emit('toggle-active', shift)"
            />
            <PrimeButton
              label="Löschen"
              severity="danger"
              outlined
              class="min-h-10"
              @click="emit('delete', shift)"
            />
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

        <PrimeColumn field="name" header="Name" sortable>
          <template #body="{ data }">
            <span :class="{ 'opacity-50': !data.active }">{{ data.name }}</span>
          </template>
        </PrimeColumn>

        <PrimeColumn header="Zeit">
          <template #body="{ data }">{{ data.start_time }} - {{ data.end_time }} Uhr</template>
        </PrimeColumn>

        <PrimeColumn field="min_staff" header="Min. MA" sortable />

        <PrimeColumn field="active" header="Status" sortable>
          <template #body="{ data }">
            <PrimeTag
              :value="data.active ? 'Aktiv' : 'Inaktiv'"
              :severity="data.active ? 'success' : 'danger'"
            />
          </template>
        </PrimeColumn>

        <PrimeColumn header="Aktionen" style="width: 180px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <PrimeButton
                icon="pi pi-pencil"
                text
                rounded
                class="!h-10 !w-10"
                aria-label="Schicht bearbeiten"
                @click="emit('edit', data)"
              />
              <PrimeButton
                :icon="data.active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                text
                rounded
                class="!h-10 !w-10"
                :aria-label="data.active ? 'Schicht deaktivieren' : 'Schicht aktivieren'"
                @click="emit('toggle-active', data)"
              />
              <PrimeButton
                icon="pi pi-trash"
                text
                rounded
                class="!h-10 !w-10"
                severity="danger"
                aria-label="Schicht löschen"
                @click="emit('delete', data)"
              />
            </div>
          </template>
        </PrimeColumn>
      </PrimeDataTable>
    </div>
  </div>
</template>
