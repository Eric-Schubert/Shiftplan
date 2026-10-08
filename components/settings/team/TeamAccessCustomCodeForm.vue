<script setup lang="ts">
// A code of the planner's choice instead of a generated one.
defineProps<{ saving: boolean }>();
const emit = defineEmits<{ (e: "submit"): void }>();
const code = defineModel<string>("code", { required: true });
</script>

<template>
  <form class="max-w-md space-y-1.5" @submit.prevent="emit('submit')">
    <label for="team-custom-code" class="block text-sm font-medium text-[var(--text-2)]">
      Eigenen Code festlegen (optional)
    </label>
    <div class="flex gap-2">
      <PrimeInputText
        id="team-custom-code"
        v-model="code"
        class="min-w-0 flex-1 font-mono uppercase placeholder:normal-case"
        placeholder="mind. 6 Zeichen"
        autocomplete="off"
        spellcheck="false"
        :disabled="saving"
      />
      <PrimeButton
        type="submit"
        label="Speichern"
        severity="secondary"
        outlined
        class="min-h-11"
        :disabled="code.trim().length < 6"
      />
    </div>
  </form>
</template>
