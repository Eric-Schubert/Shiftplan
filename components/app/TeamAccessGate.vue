<script setup lang="ts">
const props = defineProps<{
  initialError?: string;
}>();

const emit = defineEmits<{
  (e: "granted"): void;
}>();

const { login } = useViewerAccess();
const code = ref("");
const error = ref(props.initialError || "");
const loading = ref(false);
const errorId = "team-access-error";

async function submit() {
  if (!code.value.trim()) {
    error.value = "Bitte Zugangscode eingeben";
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    await login(code.value);
    emit("granted");
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Zugangscode ist falsch";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <div class="planner-slab w-full max-w-sm !p-6">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <i class="pi pi-lock text-lg" aria-hidden="true"></i>
        </div>
        <h2 class="text-xl font-semibold text-[var(--text-1)]">Schichtplan öffnen</h2>
        <p class="mt-2 text-sm leading-6 text-[var(--text-2)]">
          Gib den Zugangscode ein, den du von deiner Schichtplanung bekommen hast. Mit dem QR-Code
          geht es ohne Eintippen.
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <label for="team-access-code" class="block text-sm font-medium text-[var(--text-2)]">
            Zugangscode
          </label>
          <PrimeInputText
            id="team-access-code"
            v-model="code"
            type="text"
            class="w-full font-mono uppercase"
            :class="{ 'p-invalid': error }"
            :disabled="loading"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            :aria-describedby="error ? errorId : undefined"
          />
          <small v-if="error" :id="errorId" class="mt-1 block text-sm text-[var(--danger-ink)]" role="alert">
            {{ error }}
          </small>
        </div>

        <PrimeButton
          type="submit"
          label="Plan öffnen"
          icon="pi pi-lock-open"
          class="min-h-11 w-full"
          :loading="loading"
        />

        <div class="pt-2 text-center">
          <NuxtLink
            to="/settings"
            :prefetch="false"
            class="text-sm font-medium text-[var(--text-2)] underline decoration-transparent underline-offset-4 transition hover:text-[var(--accent-strong)] hover:decoration-current"
          >
            Als Planer anmelden
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>
