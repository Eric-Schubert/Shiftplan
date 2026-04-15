<script setup lang="ts">
import type { User, UserRole } from "~/types/auth";

const users = ref<User[]>([]);
const loading = ref(true);

// Neuer Benutzer
const showCreateDialog = ref(false);
const newUser = ref({ username: "", password: "", role: "planner" as UserRole });
const creating = ref(false);
const createError = ref("");

// Laden
async function fetchUsers() {
  loading.value = true;
  try {
    users.value = await $fetch<User[]>("/api/auth/users");
  } finally {
    loading.value = false;
  }
}

// Erstellen
async function createUser() {
  createError.value = "";

  if (!newUser.value.username || !newUser.value.password) {
    createError.value = "Alle Felder ausfüllen";
    return;
  }

  creating.value = true;
  try {
    await $fetch("/api/auth/users", {
      method: "POST",
      body: newUser.value,
    });
    showCreateDialog.value = false;
    newUser.value = { username: "", password: "", role: "planner" };
    await fetchUsers();
  } catch (error: any) {
    createError.value = error.data?.statusMessage || "Fehler beim Erstellen";
  } finally {
    creating.value = false;
  }
}

// Löschen
async function deleteUser(user: User) {
  if (!confirm(`Benutzer "${user.username}" wirklich löschen?`)) return;

  try {
    await $fetch(`/api/auth/users/${user.user_id}`, { method: "DELETE" });
    await fetchUsers();
  } catch (error: any) {
    alert(error.data?.statusMessage || "Fehler beim Löschen");
  }
}

// Rollen-Badge Farben
function roleSeverity(role: UserRole): string {
  return role === "admin" ? "danger" : "info";
}

function roleLabel(role: UserRole): string {
  return role === "admin" ? "Admin" : "Planer";
}

onMounted(fetchUsers);
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <p class="text-gray-500 dark:text-gray-400 text-sm">
        Verwalte Benutzer und deren Berechtigungen
      </p>
      <PrimeButton
        label="Neuer Benutzer"
        icon="pi pi-user-plus"
        size="small"
        @click="showCreateDialog = true"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-8">
      <PrimeProgressSpinner />
    </div>

    <!-- User Liste -->
    <div v-else class="space-y-2">
      <div
        v-for="user in users"
        :key="user.user_id"
        class="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 px-4 py-3"
      >
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
               :class="user.role === 'admin' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'">
            {{ user.username.charAt(0).toUpperCase() }}
          </div>
          <div>
            <span class="font-medium text-gray-900 dark:text-white text-sm">
              {{ user.username }}
            </span>
            <div class="flex items-center gap-2 mt-0.5">
              <PrimeTag :value="roleLabel(user.role)" :severity="roleSeverity(user.role)" class="text-xs" />
              <span v-if="!user.active" class="text-xs text-gray-400">Inaktiv</span>
            </div>
          </div>
        </div>

        <PrimeButton
          icon="pi pi-trash"
          severity="danger"
          text
          rounded
          size="small"
          @click="deleteUser(user)"
        />
      </div>

      <div v-if="users.length === 0" class="text-center py-8 text-gray-400">
        Keine Benutzer vorhanden
      </div>
    </div>

    <!-- Create Dialog -->
    <PrimeDialog
      v-model:visible="showCreateDialog"
      modal
      header="Neuer Benutzer"
      :style="{ width: '400px', maxWidth: '95vw' }"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Benutzername
          </label>
          <PrimeInputText
            v-model="newUser.username"
            class="w-full"
            placeholder="z.B. schichtleitung"
            :disabled="creating"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Passwort
          </label>
          <PrimeInputText
            v-model="newUser.password"
            type="password"
            class="w-full"
            placeholder="Min. 8 Zeichen"
            :disabled="creating"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rolle
          </label>
          <PrimeSelect
            v-model="newUser.role"
            :options="[
              { label: 'Planer – Darf Schichtzuweisungen ändern', value: 'planner' },
              { label: 'Admin – Vollzugriff', value: 'admin' },
            ]"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="creating"
          />
        </div>

        <small v-if="createError" class="text-red-500 block">
          {{ createError }}
        </small>
      </div>

      <template #footer>
        <PrimeButton
          label="Abbrechen"
          severity="secondary"
          text
          @click="showCreateDialog = false"
        />
        <PrimeButton
          label="Erstellen"
          icon="pi pi-check"
          :loading="creating"
          @click="createUser"
        />
      </template>
    </PrimeDialog>
  </div>
</template>
