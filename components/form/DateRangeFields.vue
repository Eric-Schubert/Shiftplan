<script setup lang="ts">
// „Von“ and „Bis“ date inputs; the range never runs backwards.
defineProps<{ idPrefix: string; min?: string }>();
const from = defineModel<string>("from", { required: true });
const to = defineModel<string>("to", { required: true });

watch(from, (value) => {
  if (to.value < value) to.value = value;
});
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div class="space-y-1.5">
      <label :for="`${idPrefix}-from`" class="block font-medium text-[var(--text-2)]">Von</label>
      <input :id="`${idPrefix}-from`" v-model="from" type="date" :min="min" required class="p-inputtext p-component w-full" />
    </div>
    <div class="space-y-1.5">
      <label :for="`${idPrefix}-to`" class="block font-medium text-[var(--text-2)]">Bis</label>
      <input :id="`${idPrefix}-to`" v-model="to" type="date" :min="from" required class="p-inputtext p-component w-full" />
    </div>
  </div>
</template>
