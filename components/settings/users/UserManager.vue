<script setup lang="ts">
import type { User } from "~/types/auth";

const users = ref<User[]>([]);
const loading = ref(true);
const loadError = ref("");
const requestError = useRequestError();
const showCreateDialog = ref(false);
const showDeleteDialog = ref(false);
const userToDelete = ref<User | null>(null);

async function fetchUsers() {
  loading.value = true;
  loadError.value = "";
  try {
    users.value = await $fetch<User[]>("/api/auth/users");
  } catch (cause) {
    loadError.value = requestError(cause, "settings.loadFailed");
  } finally {
    loading.value = false;
  }
}

function openDeleteDialog(user: User) {
  userToDelete.value = user;
  showDeleteDialog.value = true;
}

onMounted(fetchUsers);
</script>

<template>
  <div class="space-y-4">
    <UserManagementHeader @create="showCreateDialog = true" />

    <AppRetryNotice v-if="loadError && !loading" :message="loadError" @retry="fetchUsers" />
    <UserManagementList v-else :users="users" :loading="loading" @delete="openDeleteDialog" />

    <UserCreateDialog :visible="showCreateDialog" @update:visible="showCreateDialog = $event" @created="fetchUsers" />

    <UserDeleteDialog :visible="showDeleteDialog" :user="userToDelete" @update:visible="showDeleteDialog = $event" @deleted="fetchUsers" />
  </div>
</template>
