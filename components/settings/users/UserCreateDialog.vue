<script setup lang="ts">
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
const configStore = useConfigStore();

const createError = ref("");
const createErrorId = "create-user-error";
const formId = "create-user-form";
const creating = ref(false);
const form = ref<UserCreatePayload>(createEmptyForm());
const { t } = useI18n();
const passwordHint = computed(() => configStore.passwordPolicy.hint || t("settings.auth.passwordHint"));

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const roleOptions = computed<Array<{ label: string; value: UserRole }>>(() => [
  { label: t("settings.users.form.roles.planner"), value: "planner" },
  { label: t("settings.users.form.roles.admin"), value: "admin" },
]);

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
  const problem = newUserProblem(form.value, configStore);
  createError.value = problem ? t(problem.key, problem.params ?? {}) : "";
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
    createError.value = error.data?.statusMessage || t("settings.users.form.failed");
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    modal
    :header="t('settings.users.create')"
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <form :id="formId" class="space-y-4" @submit.prevent="createUser">
      <div>
        <label for="create-username" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t("settings.auth.username") }}
        </label>
        <PrimeInputText
          v-model="form.username"
          id="create-username"
          class="w-full"
          :placeholder="t('settings.users.form.usernamePlaceholder')"
          :disabled="creating"
          :aria-describedby="createError ? createErrorId : undefined"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
        />
        <small class="mt-1 block text-xs text-gray-500 dark:text-gray-400">
          {{ t("settings.users.form.caseSensitive") }}
        </small>
      </div>

      <div>
        <label for="create-password" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t("settings.auth.password") }}
        </label>
        <PrimeInputText
          v-model="form.password"
          id="create-password"
          type="password"
          class="w-full"
          :placeholder="passwordHint"
          :disabled="creating"
          :aria-describedby="createError ? createErrorId : undefined"
        />
      </div>

      <div>
        <label for="create-role" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t("settings.users.form.role") }}
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
    </form>

    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" severity="secondary" text @click="dialogVisible = false" />
      <PrimeButton
        type="submit"
        :form="formId"
        :label="t('common.actions.create')"
        icon="pi pi-check"
        class="min-h-11"
        :loading="creating"
      />
    </template>
  </PrimeDialog>
</template>
