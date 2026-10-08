<script setup lang="ts">
// Optional push to the team about an absence; the reason stays with the planners.
const notifyTeam = defineModel<boolean>("notify", { required: true });
const message = defineModel<string>("message", { required: true });
</script>

<template>
  <div class="space-y-2 rounded-lg border border-[var(--border-soft)] p-3">
    <label class="flex items-center gap-2 font-medium text-[var(--text-1)]">
      <PrimeCheckbox v-model="notifyTeam" binary input-id="absence-notify" />
      Team per Push informieren
    </label>
    <template v-if="notifyTeam">
      <PrimeInputText
        v-model="message"
        maxlength="160"
        placeholder="Zusatztext, z. B. Wer kann übernehmen?"
        class="w-full"
      />
      <p class="text-xs text-[var(--text-3)]">Das Team sieht Name und Zeitraum, nie den Grund.</p>
    </template>
  </div>
</template>
