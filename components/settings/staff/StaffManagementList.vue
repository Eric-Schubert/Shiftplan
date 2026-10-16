<script setup lang="ts">
import type { Staff } from "~/types/staff";

defineProps<{
  staff: Staff[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "edit", staff: Staff): void;
  (e: "toggle-active", staff: Staff): void;
  (e: "delete", staff: Staff): void;
}>();
const { t } = useI18n();
</script>

<template>
  <div>
    <div class="space-y-3 sm:hidden">
      <div
        v-for="staffMember in staff"
        :key="staffMember.staff_id"
        class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-2">
            <p class="text-sm font-semibold text-gray-900 dark:text-white" :class="{ 'opacity-50': !staffMember.active }">
              {{ staffMember.name }}
              <span v-if="staffMember.short_code" class="ml-1 font-mono text-xs font-semibold text-[var(--text-3)]">{{ staffMember.short_code }}</span>
            </p>
            <div class="flex flex-wrap gap-2">
              <PrimeTag
                :value="staffMember.is_parttime ? t('settings.staff.partTime') : t('settings.staff.fullTime')"
                :severity="staffMember.is_parttime ? 'info' : 'secondary'"
              />
              <PrimeTag
                :value="staffMember.active ? t('settings.list.active') : t('settings.list.inactive')"
                :severity="staffMember.active ? 'success' : 'danger'"
              />
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <PrimeButton
              :label="t('common.actions.edit')"
              severity="secondary"
              outlined
              class="min-h-10"
              @click="emit('edit', staffMember)"
            />
            <PrimeButton
              :label="staffMember.active ? t('common.actions.deactivate') : t('common.actions.activate')"
              severity="secondary"
              outlined
              class="min-h-10"
              @click="emit('toggle-active', staffMember)"
            />
            <PrimeButton
              :label="t('common.actions.delete')"
              severity="danger"
              outlined
              class="min-h-10"
              @click="emit('delete', staffMember)"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="hidden sm:block">
      <PrimeDataTable
        :value="staff"
        striped-rows
        :loading="loading"
        :paginator="staff.length > 10"
        :rows="10"
      >
        <PrimeColumn field="name" :header="t('validation.fields.name')" sortable>
          <template #body="{ data }">
            <span :class="{ 'opacity-50': !data.active }">{{ data.name }}</span>
            <span v-if="data.short_code" class="ml-2 font-mono text-xs font-semibold text-[var(--text-3)]">{{ data.short_code }}</span>
          </template>
        </PrimeColumn>

        <PrimeColumn field="is_parttime" :header="t('settings.staff.workingTime')" sortable>
          <template #body="{ data }">
            <PrimeTag
              :value="data.is_parttime ? t('settings.staff.partTime') : t('settings.staff.fullTime')"
              :severity="data.is_parttime ? 'info' : 'secondary'"
            />
          </template>
        </PrimeColumn>

        <PrimeColumn field="active" :header="t('settings.list.status')" sortable>
          <template #body="{ data }">
            <PrimeTag
              :value="data.active ? t('settings.list.active') : t('settings.list.inactive')"
              :severity="data.active ? 'success' : 'danger'"
            />
          </template>
        </PrimeColumn>

        <PrimeColumn :header="t('settings.list.actions')" style="width: 180px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <PrimeButton
                icon="pi pi-pencil"
                text
                rounded
                class="!h-10 !w-10"
                :aria-label="t('settings.staff.edit')"
                @click="emit('edit', data)"
              />
              <PrimeButton
                :icon="data.active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                text
                rounded
                class="!h-10 !w-10"
                :aria-label="data.active ? t('settings.staff.deactivate') : t('settings.staff.activate')"
                @click="emit('toggle-active', data)"
              />
              <PrimeButton
                icon="pi pi-trash"
                text
                rounded
                class="!h-10 !w-10"
                severity="danger"
                :aria-label="t('settings.staff.delete')"
                @click="emit('delete', data)"
              />
            </div>
          </template>
        </PrimeColumn>
      </PrimeDataTable>
    </div>
  </div>
</template>
