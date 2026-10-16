// Public runtime config read from NUXT_PUBLIC_* variables at build time.
export const publicRuntimeEnv = {
  imprint: {
    providerName: process.env.NUXT_PUBLIC_IMPRINT_PROVIDER_NAME || "",
    streetAddress: process.env.NUXT_PUBLIC_IMPRINT_STREET_ADDRESS || "",
    postalCode: process.env.NUXT_PUBLIC_IMPRINT_POSTAL_CODE || "",
    city: process.env.NUXT_PUBLIC_IMPRINT_CITY || "",
    country: process.env.NUXT_PUBLIC_IMPRINT_COUNTRY || "Deutschland",
    publicEmail: process.env.NUXT_PUBLIC_IMPRINT_PUBLIC_EMAIL || "",
    phone: process.env.NUXT_PUBLIC_IMPRINT_PHONE || "",
    representedBy: process.env.NUXT_PUBLIC_IMPRINT_REPRESENTED_BY || "",
    registerCourt: process.env.NUXT_PUBLIC_IMPRINT_REGISTER_COURT || "",
    registerNumber: process.env.NUXT_PUBLIC_IMPRINT_REGISTER_NUMBER || "",
    vatId: process.env.NUXT_PUBLIC_IMPRINT_VAT_ID || "",
  },
  demoLogin: {
    username: process.env.NUXT_PUBLIC_DEMO_LOGIN_USERNAME || "",
    password: process.env.NUXT_PUBLIC_DEMO_LOGIN_PASSWORD || "",
  },
  privacy: {
    cloudflare: process.env.NUXT_PUBLIC_PRIVACY_CLOUDFLARE === "true",
    // Name and address of the hosting provider, e.g. „netcup GmbH, Emmy-Noether-Straße 10, 76131 Karlsruhe“.
    hoster: process.env.NUXT_PUBLIC_PRIVACY_HOSTER || "",
    // Country of the hoster's data centre, e.g. „Deutschland“; empty when unknown, then the privacy policy names none.
    hosterLocation: process.env.NUXT_PUBLIC_PRIVACY_HOSTER_LOCATION || "",
  },
};
