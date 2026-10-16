import { computed, createSSRApp, defineComponent, h, reactive, ref, type Component } from "vue";
import { renderToString } from "vue/server-renderer";
import type { AppLocale } from "~/i18n/config";
import Imprint from "~/pages/impressum.vue";
import Privacy from "~/pages/datenschutz.vue";
import type { PrivacyFacts } from "~/types/privacy";

// Renders the legal pages on the server as Nuxt would, with its auto-imports and components stubbed:
// the locale stands in for the shiftplan_locale cookie, the facts for /api/legal/privacy.

export type LegalSetup = {
  locale: AppLocale;
  facts?: Partial<PrivacyFacts>;
  cloudflare?: boolean;
  hoster?: string;
  demo?: boolean;
};

export type LegalRender = { html: string; seo: Record<string, string>; pageMeta: { alias?: string[] } };

export const IMPRINT = {
  providerName: "ES Software",
  streetAddress: "Musterstraße 1",
  postalCode: "01067",
  city: "Dresden",
  country: "Deutschland",
  publicEmail: "info@example.com",
  phone: "+49 351 000000",
  representedBy: "Eric Schubert",
  registerCourt: "",
  registerNumber: "",
  vatId: "DE123456789",
};

const LEGAL_COMPONENTS = import.meta.glob<Component>("/components/legal/**/*.vue", { eager: true, import: "default" });

const NuxtLink = defineComponent({
  props: { to: { type: String, required: true } },
  setup:
    (props, { slots }) =>
    () =>
      h("a", { href: props.to }, slots.default?.()),
});
const PrimeButton = defineComponent({
  props: { label: { type: String, default: "" } },
  setup: (props) => () => h("button", props.label),
});

function stubNuxt(setup: LegalSetup, render: LegalRender) {
  const contactForm = reactive({ name: "", replyTo: "", subject: "", message: "", company: "" });
  const globals: Record<string, unknown> = {
    computed,
    definePageMeta: (meta: LegalRender["pageMeta"]) => Object.assign(render.pageMeta, meta),
    useSeoMeta: (meta: Record<string, string>) => Object.assign(render.seo, meta),
    useI18n: () => ({ locale: ref(setup.locale), setLocale: async () => {} }),
    useFetch: async () => ({ data: ref(setup.facts ?? null) }),
    useRuntimeConfig: () => ({
      public: {
        imprint: IMPRINT,
        demoLogin: setup.demo ? { username: "demo", password: "demo" } : {},
        privacy: { cloudflare: setup.cloudflare ?? false, hoster: setup.hoster ?? "" },
      },
    }),
    useImprintContactForm: () => ({
      contactForm,
      sending: ref(false),
      sent: ref(false),
      error: ref(""),
      contactValidation: ref({}),
      hasValidationErrors: ref(false),
      showValidation: ref(false),
      messageHelpText: ref("contact.form.storedNote"),
      submitContact: () => {},
    }),
  };
  Object.assign(globalThis, globals);
}

// The stubs are globals, so one page renders at a time.
let queue: Promise<unknown> = Promise.resolve();

function render(page: Component, setup: LegalSetup): Promise<LegalRender> {
  const next = queue.then(() => renderNow(page, setup));
  queue = next.catch(() => {});
  return next;
}

async function renderNow(page: Component, setup: LegalSetup): Promise<LegalRender> {
  const result: LegalRender = { html: "", seo: {}, pageMeta: {} };
  stubNuxt(setup, result);
  const app = createSSRApp(page);
  for (const [file, component] of Object.entries(LEGAL_COMPONENTS)) {
    app.component(file.split("/").pop()!.replace(".vue", ""), component);
  }
  app.component("NuxtLink", NuxtLink);
  app.component("PrimeButton", PrimeButton);
  app.component("PrimeInputText", { render: () => h("input") });
  app.component("PrimeTextarea", { render: () => h("textarea") });
  result.html = await renderToString(app);
  return result;
}

export const renderPrivacy = (setup: LegalSetup) => render(Privacy, setup);
export const renderImprint = (setup: LegalSetup) => render(Imprint, setup);

/** The visible text of rendered HTML, one space between words. */
export function textOf(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** The ids of the privacy sections in their order. */
export function sectionIds(html: string): string[] {
  return [...html.matchAll(/<section id="([^"]+)"/g)].map((match) => match[1]!);
}
