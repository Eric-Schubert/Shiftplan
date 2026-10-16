<script setup lang="ts">
import type { User } from "~/types/auth";

const props = defineProps<{
  visible: boolean;
  user: User | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "deleted"): void;
}>();

const { authFetch } = useAuthFetch();

const deleting = ref(false);
const deleteError = ref("");
const { t } = useI18n();
const requestError = useRequestError();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      deleteError.value = "";
    }
  }
);

async function deleteUser() {
  if (!props.user) return;

  deleting.value = true;
  try {
    await authFetch(`/api/auth/users/${props.user.user_id}`, { method: "DELETE" });
    dialogVisible.value = false;
    emit("deleted");
  } catch (error) {
    deleteError.value = requestError(error, "settings.users.deleteFailed");
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal :header="t('settings.users.delete')" :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }">
    <div class="space-y-3">
      <i18n-t keypath="settings.users.deleteText" tag="p" class="text-sm text-gray-700 dark:text-gray-300">
        <template #name
          ><strong>{{ user?.username }}</strong></template
        >
      </i18n-t>

      <small v-if="deleteError" class="block text-sm text-red-600 dark:text-red-400" role="alert">
        {{ deleteError }}
      </small>
    </div>

    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" severity="secondary" text @click="dialogVisible = false" />
      <PrimeButton :label="t('settings.users.delete')" severity="danger" class="min-h-11" :loading="deleting" @click="deleteUser" />
    </template>
  </PrimeDialog>
</template>
