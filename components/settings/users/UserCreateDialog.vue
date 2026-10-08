<script setup lang="ts">
import { PASSWORD_POLICY_HINT } from "~/utils/password-policy";
import { newUserProblem } from "~/utils/account-forms";
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
const form = ref<UserCreatePayload>(createEmptyForm());

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: "Planer – Darf Schichtzuweisungen ändern", value: "planner" },
  { label: "Admin – Vollzugriff", value: "admin" },
];

function createEmptyForm(): UserCreatePayload {
  return { username: "", password: "", role: "planner" };
}

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) form.value = createEmptyForm();
    createError.value = "";
  }
);

async function createUser() {
  const problem = newUserProblem(form.value);
  createError.value = problem ?? "";
  if (problem) return;

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
        <label for="create-username" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
        <label for="create-password" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Passwort
        </label>
        <PrimeInputText
          v-model="form.password"
          id="create-password"
          type="password"
          class="w-full"
          :placeholder="PASSWORD_POLICY_HINT"
          :disabled="creating"
          :aria-describedby="createError ? createErrorId : undefined"
        />
      </div>

      <div>
        <label for="create-role" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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

      <small v-if="createError" :id="createErrorId" class="block text-red-600 dark:text-red-400" role="alert">
        {{ createError }}
      </small>
    </div>

    <template #footer>
      <PrimeButton label="Abbrechen" severity="secondary" text @click="dialogVisible = false" />
      <PrimeButton label="Erstellen" icon="pi pi-check" class="min-h-11" :loading="creating" @click="createUser" />
    </template>
  </PrimeDialog>
</template>
