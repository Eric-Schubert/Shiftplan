<script setup lang="ts">
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";

// New takeover (give away one shift on one day) or swap (all shifts with someone for a period).
const props = defineProps<{ visible: boolean; staffId: number }>();
const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "created"): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const { data: shifts } = await useFetch<Shift[]>("/api/shift", { default: () => [] });
const { data: staff } = await useFetch<Staff[]>("/api/staff", { default: () => [] });

const kindOptions = [
  { label: "Schicht abgeben", value: "takeover" },
  { label: "Schichten tauschen", value: "swap" },
];
const shiftOptions = computed(() => [
  { label: "Meine Schicht an dem Tag", value: null },
  ...(shifts.value ?? []).filter((shift) => shift.active).map((shift) => ({ label: shift.name, value: shift.shift_id })),
]);
const partnerOptions = computed(() =>
  (staff.value ?? [])
    .filter((person) => person.active && person.staff_id !== props.staffId)
    .map((person) => ({ label: person.name, value: person.staff_id }))
);

const today = todayISO();
const kind = ref<"takeover" | "swap">("takeover");
const date = ref(today);
const shiftId = ref<number | null>(null);
const partnerId = ref<number | null>(null);
const from = ref(today);
const to = ref(today);
const message = ref("");
const saving = ref(false);
const error = ref("");

watch(from, (value) => {
  if (to.value < value) to.value = value;
});

async function save() {
  if (kind.value === "swap" && !partnerId.value) {
    error.value = "Bitte wähle, mit wem du tauschen möchtest";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    await $fetch("/api/member/requests", {
      method: "POST",
      body:
        kind.value === "takeover"
          ? { kind: "takeover", date: date.value, shiftId: shiftId.value ?? undefined, message: message.value || undefined }
          : { kind: "swap", partnerStaffId: partnerId.value, from: from.value, to: to.value, message: message.value || undefined },
    });
    emit("created");
    dialogVisible.value = false;
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Anfrage konnte nicht gestellt werden";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Neue Anfrage"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <form class="space-y-4 text-sm" @submit.prevent="save">
      <div class="grid grid-cols-2 gap-1 rounded-lg bg-[var(--surface-muted)] p-1" role="radiogroup" aria-label="Art der Anfrage">
        <button
          v-for="option in kindOptions"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="kind === option.value"
          class="min-h-9 rounded-md px-3 font-medium transition-colors"
          :class="kind === option.value ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'"
          @click="kind = option.value as 'takeover' | 'swap'"
        >
          {{ option.label }}
        </button>
      </div>

      <template v-if="kind === 'takeover'">
        <p class="text-[var(--text-2)]">Das Team bekommt Bescheid. Wer zuerst zusagt, übernimmt deine Schicht an diesem Tag.</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label for="request-date" class="block font-medium text-[var(--text-2)]">Tag</label>
            <input id="request-date" v-model="date" type="date" :min="today" required class="p-inputtext p-component w-full" />
          </div>
          <div class="space-y-1.5">
            <label for="request-shift" class="block font-medium text-[var(--text-2)]">Schicht</label>
            <PrimeSelect
              v-model="shiftId"
              input-id="request-shift"
              :options="shiftOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <p class="text-[var(--text-2)]">Ihr tauscht im Zeitraum alle Schichten. Erst wenn die andere Person zusagt, ändert sich der Plan.</p>
        <div class="space-y-1.5">
          <label for="request-partner" class="block font-medium text-[var(--text-2)]">Tauschen mit</label>
          <PrimeSelect
            v-model="partnerId"
            input-id="request-partner"
            :options="partnerOptions"
            option-label="label"
            option-value="value"
            placeholder="Bitte wählen"
            filter
            class="w-full"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label for="request-from" class="block font-medium text-[var(--text-2)]">Von</label>
            <input id="request-from" v-model="from" type="date" :min="today" required class="p-inputtext p-component w-full" />
          </div>
          <div class="space-y-1.5">
            <label for="request-to" class="block font-medium text-[var(--text-2)]">Bis</label>
            <input id="request-to" v-model="to" type="date" :min="from" required class="p-inputtext p-component w-full" />
          </div>
        </div>
        <p class="text-xs text-[var(--text-3)]">Höchstens 8 Wochen am Stück.</p>
      </template>

      <PrimeInputText v-model="message" maxlength="160" placeholder="Nachricht (optional)" class="w-full" />
      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </form>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="dialogVisible = false" />
      <PrimeButton label="Anfrage senden" icon="pi pi-send" class="min-h-11" :loading="saving" @click="save" />
    </template>
  </PrimeDialog>
</template>
