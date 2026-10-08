<script setup lang="ts">
// First sign-in with the personal code from the planner.
defineProps<{ busy: boolean; error: string }>();
const emit = defineEmits<{ (e: "submit"): void; (e: "use-pin"): void }>();
const code = defineModel<string>("code", { required: true });
</script>

<template>
  <form class="space-y-4 text-sm" @submit.prevent="emit('submit')">
    <p class="text-[var(--text-2)]">
      Den persönlichen Code bekommst du von deiner Schichtplanung (Einstellungen → App-Zugänge). Danach legst du deine
      PIN fest.
    </p>
    <div class="space-y-1.5">
      <label for="member-invite-code" class="block font-medium text-[var(--text-2)]">Persönlicher Code</label>
      <PrimeInputText
        id="member-invite-code"
        v-model="code"
        maxlength="20"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        class="w-full font-mono uppercase"
        :disabled="busy"
      />
    </div>
    <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    <PrimeButton type="submit" label="Weiter" icon="pi pi-arrow-right" icon-pos="right" class="min-h-11 w-full" :loading="busy" />
    <p class="text-center">
      <button type="button" class="font-medium text-[var(--accent-strong)] hover:underline" @click="emit('use-pin')">
        Ich habe schon eine PIN
      </button>
    </p>
  </form>
</template>
