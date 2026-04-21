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
            </p>
            <div class="flex flex-wrap gap-2">
              <PrimeTag
                :value="staffMember.is_parttime ? 'Teilzeit' : 'Vollzeit'"
                :severity="staffMember.is_parttime ? 'secondary' : 'primary'"
              />
              <PrimeTag
                :value="staffMember.active ? 'Aktiv' : 'Inaktiv'"
                :severity="staffMember.active ? 'success' : 'danger'"
              />
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <PrimeButton
              label="Bearbeiten"
              severity="secondary"
              outlined
              class="min-h-10"
              @click="emit('edit', staffMember)"
            />
            <PrimeButton
              :label="staffMember.active ? 'Deaktivieren' : 'Aktivieren'"
              severity="secondary"
              outlined
              class="min-h-10"
              @click="emit('toggle-active', staffMember)"
            />
            <PrimeButton
              label="Löschen"
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
        <PrimeColumn field="name" header="Name" sortable>
          <template #body="{ data }">
            <span :class="{ 'opacity-50': !data.active }">{{ data.name }}</span>
          </template>
        </PrimeColumn>

        <PrimeColumn field="is_parttime" header="Arbeitszeit" sortable>
          <template #body="{ data }">
            <PrimeTag
              :value="data.is_parttime ? 'Teilzeit' : 'Vollzeit'"
              :severity="data.is_parttime ? 'secondary' : 'primary'"
            />
          </template>
        </PrimeColumn>

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
                aria-label="Mitarbeiter bearbeiten"
                @click="emit('edit', data)"
              />
              <PrimeButton
                :icon="data.active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                text
                rounded
                class="!h-10 !w-10"
                :aria-label="data.active ? 'Mitarbeiter deaktivieren' : 'Mitarbeiter aktivieren'"
                @click="emit('toggle-active', data)"
              />
              <PrimeButton
                icon="pi pi-trash"
                text
                rounded
                class="!h-10 !w-10"
                severity="danger"
                aria-label="Mitarbeiter löschen"
                @click="emit('delete', data)"
              />
            </div>
          </template>
        </PrimeColumn>
      </PrimeDataTable>
    </div>
  </div>
</template>
