<script setup lang="ts">
import { PIN_MAX_LENGTH } from "~/shared/utils/limits";

// Header entry for the personal sign-in: "Anmelden" or the signed-in person with PIN and sign-out.
const { member, setPin, logout } = useMember();
const { load: loadViewerStatus } = useViewerAccess();
const { detect: syncPush } = usePushNotifications();

const showLogin = useState<boolean>("member-login-open", () => false);
const showAccount = ref(false);
const currentPin = ref("");
const newPin = ref("");
const repeatPin = ref("");
const busy = ref(false);
const error = ref("");
const saved = ref(false);
const { t } = useI18n();
const requestError = useRequestError();

function openAccount() {
  currentPin.value = "";
  newPin.value = "";
  repeatPin.value = "";
  error.value = "";
  saved.value = false;
  showAccount.value = true;
}

async function savePin() {
  const problem = pinProblem(newPin.value, repeatPin.value);
  if (problem) {
    error.value = t(problem.key, problem.params ?? {});
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    await setPin(newPin.value, member.value?.hasPin ? currentPin.value : undefined);
    saved.value = true;
    currentPin.value = newPin.value = repeatPin.value = "";
  } catch (cause) {
    error.value = requestError(cause, "member.pin.saveFailed");
  } finally {
    busy.value = false;
  }
}

async function signOut() {
  busy.value = true;
  error.value = "";
  try {
    await logout();
    showAccount.value = false;
    await loadViewerStatus();
    // Signing out removed this browser's push subscription; with team access it returns as a team one.
    await syncPush();
    await refreshNuxtData();
  } catch (cause) {
    error.value = requestError(cause, "member.account.signOutFailed");
  } finally {
    busy.value = false;
  }
}

async function onSignedIn() {
  await loadViewerStatus();
  // Binds an existing subscription to the person, so their own messages arrive here as well.
  await syncPush();
  await refreshNuxtData();
}
</script>

<template>
  <button v-if="member" type="button" class="app-icon-button !px-2.5" :title="t('member.account.signedInAs', { name: member.name })" @click="openAccount">
    <i class="pi pi-user text-[0.8rem]" aria-hidden="true"></i>
    <span class="max-w-[7rem] truncate text-[0.8125rem] font-medium">{{ member.name.split(" ")[0] }}</span>
  </button>
  <button v-else type="button" class="app-icon-button" :title="t('member.login.title')" :aria-label="t('member.login.title')" @click="showLogin = true">
    <i class="pi pi-user text-[0.8rem]" aria-hidden="true"></i>
    <span class="hidden text-[0.8125rem] sm:inline">{{ t("common.actions.signIn") }}</span>
  </button>

  <LazyMemberLoginDialog v-if="showLogin" v-model:visible="showLogin" @signed-in="onSignedIn" />

  <PrimeDialog
    v-if="member"
    v-model:visible="showAccount"
    :header="t('member.account.title')"
    modal
    :style="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-4 text-sm">
      <div class="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] px-3 py-2.5">
        <div class="min-w-0">
          <p class="truncate font-semibold text-[var(--text-1)]">{{ member.name }}</p>
          <p class="text-[var(--text-3)]">
            {{ t("member.shortCode") }} <span class="font-mono font-semibold text-[var(--text-2)]">{{ member.shortCode ?? "–" }}</span>
          </p>
        </div>
        <PrimeButton
          :label="t('common.actions.signOut')"
          icon="pi pi-sign-out"
          size="small"
          severity="secondary"
          outlined
          :loading="busy"
          @click="signOut"
        />
      </div>

      <form class="space-y-3" @submit.prevent="savePin">
        <h4 class="font-semibold text-[var(--text-1)]">{{ member.hasPin ? t("member.pin.change") : t("member.pin.set") }}</h4>
        <div v-if="member.hasPin" class="space-y-1.5">
          <label for="account-current-pin" class="block font-medium text-[var(--text-2)]">{{ t("member.pin.current") }}</label>
          <PrimeInputText
            id="account-current-pin"
            v-model="currentPin"
            type="password"
            inputmode="numeric"
            autocomplete="current-password"
            :maxlength="PIN_MAX_LENGTH"
            class="w-full font-mono tracking-widest"
            :disabled="busy"
          />
        </div>
        <MemberPinFields v-model:pin="newPin" v-model:repeat="repeatPin" id-prefix="account" :disabled="busy" />
        <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
        <p v-if="saved" class="text-sm text-[var(--positive-ink)]" role="status">{{ t("member.pin.saved") }}</p>
        <PrimeButton type="submit" :label="t('member.pin.save')" icon="pi pi-check" class="min-h-10 w-full" :loading="busy" />
        <p class="text-xs text-[var(--text-3)]">{{ t("member.pin.forgotten") }}</p>
      </form>
    </div>
  </PrimeDialog>
</template>
