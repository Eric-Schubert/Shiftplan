<script setup lang="ts">
import type { UserCreatePayload, UserRole } from "~/types/auth";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "created"): void;
}>();

const { authFetch } = useAuthFetch();

const createError = ref("");
const createErrorId = "create-user-error";
const creating = ref(false);
const form = ref<UserCreatePayload>({
  username: "",
  password: "",
  role: "planner",
});

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: "Planer – Darf Schichtzuweisungen ändern", value: "planner" },
  { label: "Admin – Vollzugriff", value: "admin" },
];

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      createError.value = "";
      return;
    }

    form.value = {
      username: "",
      password: "",
      role: "planner",
    };
    createError.value = "";
  }
);

async function createUser() {
  createError.value = "";

  if (!form.value.username || !form.value.password) {
    createError.value = "Benutzername und Passwort sind erforderlich.";
    return;
  }

  if (form.value.username.trim().length < 3) {
    createError.value = "Der Benutzername braucht mindestens 3 Zeichen.";
    return;
  }

  if (form.value.password.length < 8) {
    createError.value = "Das Passwort braucht mindestens 8 Zeichen.";
    return;
  }

  creating.value = true;
  try {
    await authFetch("/api/auth/users", {
      method: "POST",
      body: form.value,
    });

    dialogVisible.value = false;
    emit("created");
  } catch (error: any) {
    createError.value = error.data?.statusMessage || "Fehler beim Erstellen";
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    modal
    header="Neuer Benutzer"
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-4">
      <div>
        <label
          for="create-username"
          class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Benutzername
        </label>
        <PrimeInputText
          v-model="form.username"
          id="create-username"
          class="w-full"
          placeholder="z.B. schichtleitung"
          :disabled="creating"
          :aria-describedby="createError ? createErrorId : undefined"
        />
      </div>

      <div>
        <label
          for="create-password"
          class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Passwort
        </label>
        <PrimeInputText
          v-model="form.password"
          id="create-password"
          type="password"
          class="w-full"
          placeholder="Mindestens 8 Zeichen"
          :disabled="creating"
          :aria-describedby="createError ? createErrorId : undefined"
        />
      </div>

      <div>
        <label
          for="create-role"
          class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Rolle
        </label>
        <PrimeSelect
          v-model="form.role"
          input-id="create-role"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          :disabled="creating"
        />
      </div>

      <small
        v-if="createError"
        :id="createErrorId"
        class="block text-red-600 dark:text-red-400"
        role="alert"
      >
        {{ createError }}
      </small>
    </div>

    <template #footer>
      <PrimeButton
        label="Abbrechen"
        severity="secondary"
        text
        @click="dialogVisible = false"
      />
      <PrimeButton
        label="Erstellen"
        icon="pi pi-check"
        class="min-h-11"
        :loading="creating"
        @click="createUser"
      />
    </template>
  </PrimeDialog>
</template>
