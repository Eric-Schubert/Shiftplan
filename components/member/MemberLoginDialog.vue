<script setup lang="ts">
const props = defineProps<{
  visible: boolean;
  /** Code from a personal invite link, redeemed right away. */
  inviteCode?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "signed-in"): void;
}>();

const { member, login, redeem, setPin } = useMember();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

type Step = "pin" | "code" | "set-pin";
const step = ref<Step>(props.inviteCode ? "code" : "pin");
const shortCode = ref("");
const pin = ref("");
const code = ref(props.inviteCode ?? "");
const newPin = ref("");
const repeatPin = ref("");
const busy = ref(false);
const error = ref("");

const title = computed(() =>
  step.value === "set-pin" ? `Hallo ${member.value?.name ?? ""}` : "Persönlich anmelden"
);

async function run(action: () => Promise<void>, fallback: string) {
  busy.value = true;
  error.value = "";
  try {
    await action();
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || fallback;
  } finally {
    busy.value = false;
  }
}

function finish() {
  emit("signed-in");
  dialogVisible.value = false;
}

function submitPin() {
  if (!shortCode.value.trim() || !pin.value.trim()) {
    error.value = "Bitte Kürzel und PIN eingeben";
    return;
  }
  void run(async () => {
    await login(shortCode.value, pin.value);
    finish();
  }, "Anmeldung fehlgeschlagen");
}

function submitCode() {
  if (!code.value.trim()) {
    error.value = "Bitte den Code eingeben";
    return;
  }
  void run(async () => {
    const profile = await redeem(code.value);
    if (profile.hasPin) finish();
    else step.value = "set-pin";
  }, "Der Code ist ungültig");
}

function submitNewPin() {
  const problem = pinProblem(newPin.value, repeatPin.value);
  if (problem) {
    error.value = problem;
    return;
  }
  void run(async () => {
    await setPin(newPin.value);
    finish();
  }, "PIN konnte nicht gespeichert werden");
}

function switchTo(next: Step) {
  step.value = next;
  error.value = "";
}

// A link opened in the browser signs in at once.
onMounted(() => {
  if (props.inviteCode) submitCode();
});
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="title"
    modal
    :closable="step !== 'set-pin'"
    :style="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <form v-if="step === 'pin'" class="space-y-4 text-sm" @submit.prevent="submitPin">
      <p class="text-[var(--text-2)]">Mit deinem Kürzel und deiner PIN siehst du deine Schichten und kannst Ausfälle melden, Schichten abgeben und tauschen.</p>
      <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
        <div class="space-y-1.5">
          <label for="member-short-code" class="block font-medium text-[var(--text-2)]">Kürzel</label>
          <PrimeInputText
            id="member-short-code"
            v-model="shortCode"
            maxlength="8"
            autocomplete="username"
            autocapitalize="characters"
            spellcheck="false"
            class="w-full font-mono uppercase"
            :disabled="busy"
          />
        </div>
        <div class="space-y-1.5">
          <label for="member-pin" class="block font-medium text-[var(--text-2)]">PIN</label>
          <PrimeInputText
            id="member-pin"
            v-model="pin"
            type="password"
            inputmode="numeric"
            autocomplete="current-password"
            maxlength="12"
            class="w-full font-mono tracking-widest"
            :disabled="busy"
          />
        </div>
      </div>
      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
      <PrimeButton type="submit" label="Anmelden" icon="pi pi-sign-in" class="min-h-11 w-full" :loading="busy" />
      <p class="text-center text-[var(--text-3)]">
        Noch keine PIN?
        <button type="button" class="font-medium text-[var(--accent-strong)] hover:underline" @click="switchTo('code')">
          Mit dem Code der Planung anmelden
        </button>
      </p>
    </form>

    <form v-else-if="step === 'code'" class="space-y-4 text-sm" @submit.prevent="submitCode">
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
        <button type="button" class="font-medium text-[var(--accent-strong)] hover:underline" @click="switchTo('pin')">
          Ich habe schon eine PIN
        </button>
      </p>
    </form>

    <form v-else class="space-y-4 text-sm" @submit.prevent="submitNewPin">
      <p class="text-[var(--text-2)]">
        Du bist angemeldet. Lege jetzt eine PIN fest, dann kannst du dich auf jedem Gerät mit deinem Kürzel
        <span class="font-mono font-semibold text-[var(--text-1)]">{{ member?.shortCode }}</span> anmelden.
      </p>
      <MemberPinFields v-model:pin="newPin" v-model:repeat="repeatPin" id-prefix="member-new" :disabled="busy" />
      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
      <div class="flex gap-2">
        <PrimeButton label="Später" text class="min-h-11" :disabled="busy" @click="finish" />
        <PrimeButton type="submit" label="PIN speichern" icon="pi pi-check" class="min-h-11 flex-1" :loading="busy" />
      </div>
    </form>
  </PrimeDialog>
</template>
