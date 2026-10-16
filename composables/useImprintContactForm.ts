import { CONTACT_FIELD_IDS, validateContactForm, type ContactValidation } from "~/utils/legal/contact-form";
import { useConfigStore } from "~/stores/config.store";

/** State, validation and sending of the contact form on the imprint page. */
export function useImprintContactForm() {
  const { t } = useI18n();
  const requestError = useRequestError();
  const configStore = useConfigStore();
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

  const contactValidation = computed<ContactValidation>(() => {
    const problems = validateContactForm(contactForm, configStore.contactForm);
    return Object.fromEntries(Object.entries(problems).map(([field, problem]) => [field, t(problem.key, problem.params ?? {})]));
  });
  const hasValidationErrors = computed(() => Object.keys(contactValidation.value).length > 0);
  const canSubmit = computed(() => !hasValidationErrors.value && !sending.value);
  const showValidation = computed(() => submitAttempted.value);
  const messageCharactersRemaining = computed(() => Math.max(0, configStore.contactForm.message.minLength - contactForm.message.trim().length));
  const messageHelpText = computed(() => {
    if (messageCharactersRemaining.value > 0 && contactForm.message.trim().length > 0) {
      return t("contact.form.remaining", { remaining: messageCharactersRemaining.value });
    }

    return t("contact.form.storedNote");
  });

  async function submitContact() {
    submitAttempted.value = true;
    sent.value = false;
    error.value = "";

    if (!canSubmit.value) {
      await nextTick();
      const firstInvalidField = Object.keys(contactValidation.value)[0] as keyof ContactValidation | undefined;
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
    } catch (contactError) {
      error.value = requestError(contactError, "contact.form.sendFailed");
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
