<script setup lang="ts">
// Name of this instance as the team sees it in the app.
const emit = defineEmits<{ (e: "error", message: string): void }>();
const name = defineModel<string>("name", { required: true });

const { authFetch } = useAuthFetch();
const saving = ref(false);
const saved = ref(false);

async function save() {
  saving.value = true;
  emit("error", "");
  try {
    await authFetch("/api/team-access", { method: "POST", body: { instanceName: name.value } });
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (cause: any) {
    emit("error", cause?.data?.statusMessage || "Name konnte nicht gespeichert werden");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="max-w-md space-y-1.5" @submit.prevent="save">
    <label for="team-instance-name" class="block text-sm font-medium text-[var(--text-2)]">
      Name in der App
    </label>
    <div class="flex gap-2">
      <PrimeInputText
        id="team-instance-name"
        v-model="name"
        class="min-w-0 flex-1"
        maxlength="80"
        placeholder="z. B. Pflegeteam Nord"
        :disabled="saving"
      />
      <PrimeButton
        type="submit"
        :label="saved ? 'Gespeichert' : 'Speichern'"
        :icon="saved ? 'pi pi-check' : undefined"
        severity="secondary"
        outlined
        class="min-h-11"
        :loading="saving"
        :disabled="!name.trim()"
      />
    </div>
  </form>
</template>
