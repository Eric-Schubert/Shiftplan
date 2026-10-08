import {
  CONTACT_FIELD_IDS,
  MIN_MESSAGE_LENGTH,
  validateContactForm,
  type ContactValidation,
} from "~/utils/legal/contact-form";

/** State, validation and sending of the contact form on the imprint page. */
export function useImprintContactForm() {
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

  const contactValidation = computed<ContactValidation>(() => validateContactForm(contactForm));
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
        document.getElementById(CONTACT_FIELD_IDS[firstInvalidField])?.focus();
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

  return {
    contactForm,
    sending,
    sent,
    error,
    contactValidation,
    hasValidationErrors,
    showValidation,
    messageHelpText,
    submitContact,
  };
}
