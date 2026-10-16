<!-- Top of both English legal pages: the German text is the binding one. -->
<script setup lang="ts">
import { PRIVACY_LINK_CLASS as linkClass } from "~/utils/legal/privacy";

// Shows the German text without writing the locale cookie: the privacy policy says only the footer's
// language switch stores a choice.
const { setLocale } = useI18n();
</script>

<template>
  <p
    class="max-w-[44rem] rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-[0.9375rem] leading-6 text-[var(--text-1)]"
  >
    This is a translation for convenience; the German version is legally binding.
    <button type="button" :class="linkClass" @click="setLocale('de')">Read the German version</button>
  </p>
</template>
