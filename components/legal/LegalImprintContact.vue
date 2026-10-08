<script setup lang="ts">
import type { ContactValidation } from "~/utils/legal/contact-form";

const {
  contactForm,
  sending,
  sent,
  error,
  contactValidation,
  hasValidationErrors,
  showValidation,
  messageHelpText,
  submitContact,
} = useImprintContactForm();

function fieldError(field: keyof ContactValidation): string | undefined {
  return showValidation.value ? contactValidation.value[field] : undefined;
}
</script>

<template>
  <section class="planner-panel">
    <div class="mb-5 flex items-start justify-between gap-3">
      <div>
        <p class="planner-kicker">Kontakt</p>
        <h3 class="mt-2 text-xl font-semibold text-[var(--text-1)]">Nachricht senden</h3>
      </div>
      <span class="planner-chip planner-chip--muted">
        Formular
      </span>
    </div>

    <form class="space-y-4" @submit.prevent="submitContact">
      <div class="hidden" aria-hidden="true">
        <label for="contact-company">Firma</label>
        <input
          id="contact-company"
          v-model="contactForm.company"
          type="text"
          name="company"
          tabindex="-1"
          autocomplete="off"
        >
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <LegalImprintContactField id="contact-name" label="Name" :error="fieldError('name')">
          <PrimeInputText
            id="contact-name"
            v-model="contactForm.name"
            class="w-full"
            autocomplete="name"
            :disabled="sending"
            :invalid="Boolean(fieldError('name'))"
            :aria-invalid="Boolean(fieldError('name'))"
            aria-describedby="contact-name-error"
          />
        </LegalImprintContactField>

        <LegalImprintContactField id="contact-reply-to" label="Rückkontakt" :error="fieldError('replyTo')">
          <PrimeInputText
            id="contact-reply-to"
            v-model="contactForm.replyTo"
            class="w-full"
            placeholder="E-Mail oder Telefon"
            autocomplete="email"
            :disabled="sending"
            :invalid="Boolean(fieldError('replyTo'))"
            :aria-invalid="Boolean(fieldError('replyTo'))"
            aria-describedby="contact-reply-to-error"
          />
        </LegalImprintContactField>
      </div>

      <LegalImprintContactField id="contact-subject" label="Betreff" :error="fieldError('subject')">
        <PrimeInputText
          id="contact-subject"
          v-model="contactForm.subject"
          class="w-full"
          :disabled="sending"
          :invalid="Boolean(fieldError('subject'))"
          :aria-invalid="Boolean(fieldError('subject'))"
          aria-describedby="contact-subject-error"
        />
      </LegalImprintContactField>

      <LegalImprintContactField id="contact-message" label="Nachricht" :error="fieldError('message')">
        <PrimeTextarea
          id="contact-message"
          v-model="contactForm.message"
          class="min-h-36 w-full resize-y"
          auto-resize
          :disabled="sending"
          :invalid="Boolean(fieldError('message'))"
          :aria-invalid="Boolean(fieldError('message'))"
          aria-describedby="contact-message-help contact-message-error"
        />
        <template #hint>
          <p id="contact-message-help" class="text-xs leading-5 text-[var(--text-3)]">
            {{ messageHelpText }}
          </p>
          <p class="text-xs leading-5 text-[var(--text-3)]">
            Details zur Verarbeitung findest du in der
            <NuxtLink
              to="/datenschutz"
              class="font-medium text-[var(--accent-strong)] underline decoration-transparent underline-offset-4 transition hover:decoration-current"
            >
              Datenschutzerklärung
            </NuxtLink>.
          </p>
        </template>
      </LegalImprintContactField>

      <LegalImprintContactAlerts :invalid="showValidation && hasValidationErrors" :sent="sent" :error="error" />

      <PrimeButton
        type="submit"
        label="Nachricht senden"
        icon="pi pi-send"
        class="min-h-11 w-full sm:w-auto"
        :loading="sending"
        :disabled="sending"
      />
    </form>
  </section>
</template>
