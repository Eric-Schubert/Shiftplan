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
const { t } = useI18n();

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
  step.value === "set-pin" ? t("member.login.hello", { name: member.value?.name ?? "" }) : t("member.login.title")
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
    error.value = t("member.login.missingPin");
    return;
  }
  void run(async () => {
    await login(shortCode.value, pin.value);
    finish();
  }, t("member.login.failed"));
}

function submitCode() {
  if (!code.value.trim()) {
    error.value = t("member.login.missingCode");
    return;
  }
  void run(async () => {
    const profile = await redeem(code.value);
    if (profile.hasPin) finish();
    else step.value = "set-pin";
  }, t("member.login.codeInvalid"));
}

function submitNewPin() {
  const problem = pinProblem(newPin.value, repeatPin.value);
  if (problem) {
    error.value = t(problem.key, problem.params ?? {});
    return;
  }
  void run(async () => {
    await setPin(newPin.value);
    finish();
  }, t("member.pin.saveFailed"));
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
    <MemberLoginPinStep
      v-if="step === 'pin'"
      v-model:short-code="shortCode"
      v-model:pin="pin"
      :busy="busy"
      :error="error"
      @submit="submitPin"
      @use-code="switchTo('code')"
    />
    <MemberLoginCodeStep
      v-else-if="step === 'code'"
      v-model:code="code"
      :busy="busy"
      :error="error"
      @submit="submitCode"
      @use-pin="switchTo('pin')"
    />
    <MemberLoginSetPinStep
      v-else
      v-model:pin="newPin"
      v-model:repeat="repeatPin"
      :short-code="member?.shortCode"
      :busy="busy"
      :error="error"
      @submit="submitNewPin"
      @later="finish"
    />
  </PrimeDialog>
</template>
