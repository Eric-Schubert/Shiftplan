<script setup lang="ts">
import type { User, UserRole } from "~/types/auth";

defineProps<{
  users: User[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "delete", user: User): void;
}>();

function roleSeverity(role: UserRole): string {
  return role === "admin" ? "danger" : "info";
}

function roleLabel(role: UserRole): string {
  return role === "admin" ? "Admin" : "Planer";
}
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-8">
      <PrimeProgressSpinner />
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="user in users"
        :key="user.user_id"
        class="flex items-center justify-between rounded-lg border bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
            :class="user.role === 'admin'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'"
          >
            {{ user.username.charAt(0).toUpperCase() }}
          </div>

          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ user.username }}
            </span>
            <div class="mt-0.5 flex items-center gap-2">
              <PrimeTag
                :value="roleLabel(user.role)"
                :severity="roleSeverity(user.role)"
                class="text-xs"
              />
              <span v-if="!user.active" class="text-xs text-gray-400">Inaktiv</span>
            </div>
          </div>
        </div>

        <PrimeButton
          icon="pi pi-trash"
          severity="danger"
          outlined
          label="Löschen"
          class="min-h-10"
          @click="emit('delete', user)"
        />
      </div>

      <div v-if="users.length === 0" class="py-8 text-center text-gray-400">
        Keine Benutzer vorhanden
      </div>
    </div>
  </div>
</template>
