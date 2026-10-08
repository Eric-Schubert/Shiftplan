<script setup lang="ts">
defineProps<{
  steps: { title: string; text: string }[];
}>();

const activeStep = defineModel<number>("activeStep", { required: true });
</script>

<template>
  <ol class="grid grid-cols-3 gap-2">
    <li v-for="(step, index) in steps" :key="step.title">
      <button
        type="button"
        class="h-full w-full rounded-xl border px-3 py-2.5 text-left transition"
        :class="
          activeStep === index
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
            : 'border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
        "
        :aria-current="activeStep === index ? 'step' : undefined"
        @click="activeStep = index"
      >
        <span class="flex items-center gap-2 text-sm font-semibold">
          <i v-if="index < activeStep" class="pi pi-check text-xs" aria-hidden="true"></i>
          <span v-else class="planner-kicker !text-inherit">{{ index + 1 }}</span>
          {{ step.title }}
        </span>
        <span class="mt-0.5 hidden text-xs leading-5 sm:block">{{ step.text }}</span>
      </button>
    </li>
  </ol>
</template>
