<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();

const imprint = computed(() => runtimeConfig.public.imprint || {});
const contactForm = reactive({
  name: "",
  replyTo: "",
  subject: "",
  message: "",
  company: "",
});
const sending = ref(false);
const sent = ref(false);
const error = ref("");
const submitAttempted = ref(false);
const MIN_MESSAGE_LENGTH = 10;

type ContactValidation = {
  name?: string;
  replyTo?: string;
  subject?: string;
  message?: string;
};

const addressLines = computed(() => {
  const postalCity = [imprint.value.postalCode, imprint.value.city].filter(Boolean).join(" ");
  return [
    imprint.value.providerName,
    imprint.value.streetAddress,
    postalCity,
    imprint.value.country,
  ].filter(Boolean);
});

const hasCoreImprint = computed(
  () =>
    Boolean(imprint.value.providerName) &&
    Boolean(imprint.value.streetAddress) &&
    Boolean(imprint.value.postalCode) &&
    Boolean(imprint.value.city)
);

const contactValidation = computed<ContactValidation>(() => {
  const validation: ContactValidation = {};
  const name = contactForm.name.trim();
  const replyTo = contactForm.replyTo.trim();
  const subject = contactForm.subject.trim();
  const message = contactForm.message.trim();

  if (!name) {
    validation.name = "Bitte gib deinen Namen ein.";
  } else if (name.length < 2) {
    validation.name = "Der Name braucht mindestens 2 Zeichen.";
  }

  if (!replyTo) {
    validation.replyTo = "Bitte gib eine E-Mail-Adresse oder Telefonnummer an.";
  } else if (replyTo.length < 5) {
    validation.replyTo = "Der Rückkontakt ist zu kurz.";
  }

  if (subject && subject.length < 2) {
    validation.subject = "Der Betreff braucht mindestens 2 Zeichen.";
  }

  if (!message) {
    validation.message = "Bitte gib eine Nachricht ein.";
  } else if (message.length < MIN_MESSAGE_LENGTH) {
    validation.message = `Die Nachricht braucht mindestens ${MIN_MESSAGE_LENGTH} Zeichen.`;
  }

  return validation;
});

const hasValidationErrors = computed(() => Object.keys(contactValidation.value).length > 0);
const canSubmit = computed(() => !hasValidationErrors.value && !sending.value);
const showValidation = computed(() => submitAttempted.value);
const messageCharactersRemaining = computed(() =>
  Math.max(0, MIN_MESSAGE_LENGTH - contactForm.message.trim().length)
);
const messageHelpText = computed(() => {
  if (messageCharactersRemaining.value > 0 && contactForm.message.trim().length > 0) {
    return `Noch ${messageCharactersRemaining.value} Zeichen bis zum Senden.`;
  }

  return "Die Angaben werden zur Bearbeitung der Anfrage gespeichert.";
});
const contactFieldIds: Record<keyof ContactValidation, string> = {
  name: "contact-name",
  replyTo: "contact-reply-to",
  subject: "contact-subject",
  message: "contact-message",
};

useSeoMeta({
  title: "Impressum | Schichtplaner",
  description: "Anbieterkennzeichnung und Kontaktmöglichkeit für den Schichtplaner.",
});

async function submitContact() {
  submitAttempted.value = true;
  sent.value = false;
  error.value = "";

  if (!canSubmit.value) {
    await nextTick();
    const firstInvalidField = Object.keys(contactValidation.value)[0] as
      | keyof ContactValidation
      | undefined;
    if (firstInvalidField) {
      document.getElementById(contactFieldIds[firstInvalidField])?.focus();
    }
    return;
  }

  sending.value = true;

  try {
    await $fetch("/api/contact", {
      method: "POST",
      body: {
        name: contactForm.name,
        replyTo: contactForm.replyTo,
        subject: contactForm.subject,
        message: contactForm.message,
        company: contactForm.company,
      },
    });

    contactForm.name = "";
    contactForm.replyTo = "";
    contactForm.subject = "";
    contactForm.message = "";
    contactForm.company = "";
    submitAttempted.value = false;
    sent.value = true;
  } catch (contactError: any) {
    error.value =
      contactError?.data?.statusMessage ||
      contactError?.data?.message ||
      "Die Nachricht konnte nicht gesendet werden.";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="planner-shell">
    <section class="planner-slab">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-3">
          <p class="planner-kicker">Anbieterkennzeichnung</p>
          <div>
            <h2 class="text-2xl font-semibold text-[var(--text-1)] sm:text-3xl">Impressum</h2>
            <p class="mt-2 max-w-[48rem] text-sm leading-6 text-[var(--text-2)]">
              Angaben zum verantwortlichen Anbieter dieser Anwendung.
            </p>
          </div>
        </div>

        <NuxtLink to="/">
          <PrimeButton
            label="Zum Schichtplan"
            icon="pi pi-arrow-left"
            severity="secondary"
            outlined
            class="min-h-11 !rounded-full"
          />
        </NuxtLink>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section class="planner-panel">
        <p class="planner-kicker">Verantwortlich</p>

        <div v-if="hasCoreImprint" class="mt-4 space-y-5">
          <address class="not-italic text-base leading-7 text-[var(--text-1)]">
            <span
              v-for="line in addressLines"
              :key="line"
              class="block"
            >
              {{ line }}
            </span>
          </address>

          <dl class="space-y-3 text-sm">
            <div v-if="imprint.representedBy" class="grid gap-1">
              <dt class="font-semibold text-[var(--text-1)]">Vertreten durch</dt>
              <dd class="text-[var(--text-2)]">{{ imprint.representedBy }}</dd>
            </div>

            <div v-if="imprint.publicEmail" class="grid gap-1">
              <dt class="font-semibold text-[var(--text-1)]">E-Mail</dt>
              <dd>
                <a
                  :href="`mailto:${imprint.publicEmail}`"
                  class="font-medium text-[var(--accent-strong)] underline decoration-transparent underline-offset-4 transition hover:decoration-current"
                >
                  {{ imprint.publicEmail }}
                </a>
              </dd>
            </div>

            <div v-if="imprint.phone" class="grid gap-1">
              <dt class="font-semibold text-[var(--text-1)]">Telefon</dt>
              <dd class="text-[var(--text-2)]">{{ imprint.phone }}</dd>
            </div>

            <div v-if="imprint.registerCourt || imprint.registerNumber" class="grid gap-1">
              <dt class="font-semibold text-[var(--text-1)]">Register</dt>
              <dd class="text-[var(--text-2)]">
                {{ [imprint.registerCourt, imprint.registerNumber].filter(Boolean).join(", ") }}
              </dd>
            </div>

            <div v-if="imprint.vatId" class="grid gap-1">
              <dt class="font-semibold text-[var(--text-1)]">Umsatzsteuer-ID</dt>
              <dd class="text-[var(--text-2)]">{{ imprint.vatId }}</dd>
            </div>
          </dl>
        </div>

        <div v-else class="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-ink)]">
          Das Impressum ist noch nicht vollständig konfiguriert.
        </div>
      </section>

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
            <div class="space-y-1.5">
              <label for="contact-name" class="block text-sm font-medium text-[var(--text-2)]">
                Name
              </label>
              <PrimeInputText
                id="contact-name"
                v-model="contactForm.name"
                class="w-full"
                autocomplete="name"
                :disabled="sending"
                :invalid="showValidation && Boolean(contactValidation.name)"
                :aria-invalid="showValidation && Boolean(contactValidation.name)"
                aria-describedby="contact-name-error"
              />
              <p
                v-if="showValidation && contactValidation.name"
                id="contact-name-error"
                class="text-xs font-medium leading-5 text-[var(--danger-ink)]"
              >
                {{ contactValidation.name }}
              </p>
            </div>

            <div class="space-y-1.5">
              <label for="contact-reply-to" class="block text-sm font-medium text-[var(--text-2)]">
                Rückkontakt
              </label>
              <PrimeInputText
                id="contact-reply-to"
                v-model="contactForm.replyTo"
                class="w-full"
                placeholder="E-Mail oder Telefon"
                autocomplete="email"
                :disabled="sending"
                :invalid="showValidation && Boolean(contactValidation.replyTo)"
                :aria-invalid="showValidation && Boolean(contactValidation.replyTo)"
                aria-describedby="contact-reply-to-error"
              />
              <p
                v-if="showValidation && contactValidation.replyTo"
                id="contact-reply-to-error"
                class="text-xs font-medium leading-5 text-[var(--danger-ink)]"
              >
                {{ contactValidation.replyTo }}
              </p>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="contact-subject" class="block text-sm font-medium text-[var(--text-2)]">
              Betreff
            </label>
            <PrimeInputText
              id="contact-subject"
              v-model="contactForm.subject"
              class="w-full"
              :disabled="sending"
              :invalid="showValidation && Boolean(contactValidation.subject)"
              :aria-invalid="showValidation && Boolean(contactValidation.subject)"
              aria-describedby="contact-subject-error"
            />
            <p
              v-if="showValidation && contactValidation.subject"
              id="contact-subject-error"
              class="text-xs font-medium leading-5 text-[var(--danger-ink)]"
            >
              {{ contactValidation.subject }}
            </p>
          </div>

          <div class="space-y-1.5">
            <label for="contact-message" class="block text-sm font-medium text-[var(--text-2)]">
              Nachricht
            </label>
            <PrimeTextarea
              id="contact-message"
              v-model="contactForm.message"
              class="min-h-36 w-full resize-y"
              auto-resize
              :disabled="sending"
              :invalid="showValidation && Boolean(contactValidation.message)"
              :aria-invalid="showValidation && Boolean(contactValidation.message)"
              aria-describedby="contact-message-help contact-message-error"
            />
            <p
              v-if="showValidation && contactValidation.message"
              id="contact-message-error"
              class="text-xs font-medium leading-5 text-[var(--danger-ink)]"
            >
              {{ contactValidation.message }}
            </p>
            <p id="contact-message-help" class="text-xs leading-5 text-[var(--text-3)]">
              {{ messageHelpText }}
            </p>
          </div>

          <div
            v-if="showValidation && hasValidationErrors"
            class="rounded-2xl border border-[color-mix(in_oklab,var(--danger-ink)_24%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger-ink)]"
            role="alert"
          >
            Bitte korrigiere die markierten Felder. Danach kannst du die Nachricht senden.
          </div>

          <div
            v-if="sent"
            class="rounded-2xl border border-[color-mix(in_oklab,var(--positive-ink)_24%,transparent)] bg-[var(--positive-soft)] px-4 py-3 text-sm font-medium text-[var(--positive-ink)]"
            role="status"
          >
            Nachricht wurde gesendet.
          </div>

          <div
            v-if="error"
            class="rounded-2xl border border-[color-mix(in_oklab,var(--danger-ink)_24%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger-ink)]"
            role="alert"
          >
            {{ error }}
          </div>

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
    </div>
  </div>
</template>
