<script setup lang="ts">
import { PIN_MAX_LENGTH } from "~/shared/utils/limits";

// Sign-in with short code and PIN, the usual way back in.
defineProps<{ busy: boolean; error: string }>();
const emit = defineEmits<{ (e: "submit"): void; (e: "use-code"): void }>();
const shortCode = defineModel<string>("shortCode", { required: true });
const pin = defineModel<string>("pin", { required: true });
</script>

<template>
  <form class="space-y-4 text-sm" @submit.prevent="emit('submit')">
    <p class="text-[var(--text-2)]">{{ $t("member.login.pinIntro") }}</p>
    <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
      <div class="space-y-1.5">
        <label for="member-short-code" class="block font-medium text-[var(--text-2)]">{{ $t("member.shortCode") }}</label>
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
        <label for="member-pin" class="block font-medium text-[var(--text-2)]">{{ $t("member.login.pin") }}</label>
        <PrimeInputText
          id="member-pin"
          v-model="pin"
          type="password"
          inputmode="numeric"
          autocomplete="current-password"
          :maxlength="PIN_MAX_LENGTH"
          class="w-full font-mono tracking-widest"
          :disabled="busy"
        />
      </div>
    </div>
    <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    <PrimeButton type="submit" :label="$t('common.actions.signIn')" icon="pi pi-sign-in" class="min-h-11 w-full" :loading="busy" />
    <p class="text-center text-[var(--text-3)]">
      {{ $t("member.login.noPin") }}
      <button type="button" class="font-medium text-[var(--accent-strong)] hover:underline" @click="emit('use-code')">
        {{ $t("member.login.useCode") }}
      </button>
    </p>
  </form>
</template>
