<script setup lang="ts">
import { PRIVACY_LINK_CLASS as linkClass } from "~/utils/legal/privacy";

defineProps<{
  isDemo: boolean;
}>();

const lastUpdated = "October 2026";

useSeoMeta({
  title: "Privacy policy | Shiftplan",
  description:
    "Privacy policy for Shiftplan: which data planning, the team app, the contact form and statistics process, how long it is stored and what rights you have.",
});
</script>

<template>
  <header class="max-w-[44rem]">
    <h2 class="text-[clamp(2rem,1.5rem+2vw,2.875rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-1)]">Privacy policy</h2>
    <p class="mt-4 text-[1.0625rem] leading-7 text-[var(--text-2)]">
      Which personal data Shiftplan processes, what it is used for, how long it is kept and what rights you have.
    </p>
    <LegalTranslationNotice class="mt-4" />
    <p class="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--text-3)]">
      <span>Last updated: {{ lastUpdated }}</span>
      <NuxtLink to="/imprint" :class="linkClass">Legal notice</NuxtLink>
      <a href="/" :class="linkClass">Back to the shift plan</a>
    </p>
  </header>

  <aside
    v-if="isDemo"
    class="mt-8 max-w-[44rem] border-l-4 border-[var(--brand-red)] bg-[var(--surface)] py-3 pl-4 pr-4 text-[0.9375rem] leading-7 text-[var(--text-1)]"
  >
    <strong>This is a public demo.</strong>
    Anything you enter here can be seen by all other visitors. The demo is reset completely every 30 minutes: plan data, sign-ins, push registrations and
    contact requests are deleted. Please do not enter any real personal data here.
  </aside>
</template>
