<script setup lang="ts">
defineProps<{
  hasMember: boolean;
}>();

const emit = defineEmits<{
  (e: "signed-in"): void;
}>();

const inviteCode = defineModel<string | null>("inviteCode", { required: true });
const redeemInBrowser = ref(false);
</script>

<template>
  <div
    v-if="inviteCode && !hasMember"
    class="planner-slab mb-4 flex flex-wrap items-center gap-3 !py-3"
    role="status"
  >
    <i class="pi pi-user mt-0.5 text-[var(--accent-strong)]" aria-hidden="true"></i>
    <p class="min-w-0 flex-1 basis-60 text-sm text-[var(--text-2)]">
      <span class="font-semibold text-[var(--text-1)]">Das ist dein persönlicher Zugang.</span>
      Für die App: QR-Code in der Shiftplan-App scannen. Oder hier im Browser anmelden, der Code gilt nur einmal.
    </p>
    <PrimeButton label="Im Browser anmelden" icon="pi pi-sign-in" size="small" class="min-h-9" @click="redeemInBrowser = true" />
    <PrimeButton
      text
      rounded
      icon="pi pi-times"
      severity="secondary"
      class="!h-8 !w-8"
      aria-label="Hinweis schließen"
      @click="inviteCode = null"
    />
  </div>

  <LazyMemberLoginDialog
    v-if="redeemInBrowser"
    v-model:visible="redeemInBrowser"
    :invite-code="inviteCode"
    @signed-in="emit('signed-in')"
  />
</template>
