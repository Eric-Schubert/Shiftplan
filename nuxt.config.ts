import fs from "fs";
import path from "path";

// Version aus .version-Datei lesen (wird vom prebuild-Script erzeugt)
function getAppVersion(): string {
  try {
    const versionFile = path.resolve(__dirname, ".version");
    return fs.readFileSync(versionFile, "utf-8").trim();
  } catch {
    // Fallback auf package.json wenn .version nicht existiert (z.B. dev ohne prebuild)
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8")
      );
      return pkg.version || "0.0.0";
    } catch {
      return "0.0.0";
    }
  }
}

const primevueThemePath = path.resolve(__dirname, "theme/primevue-theme.ts");

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  sourcemap: {
    client: true,
    server: false,
  },

  // Version aus .version als Runtime-Config bereitstellen
  runtimeConfig: {
    public: {
      appVersion: getAppVersion(),
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
    },
  },

  app: {
    head: {
      htmlAttrs: {
        lang: "de",
      },
      title: "Schichtplaner",
      meta: [
        {
          name: "description",
          content: "Schichtplaner für Wochenplanung, Rotation und Teamverwaltung.",
        },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "manifest", href: "/manifest.json" },
        {
          rel: "preload",
          href: "/fonts/public-sans-latin.woff2",
          as: "font",
          type: "font/woff2",
          crossorigin: "anonymous",
        },
      ],
      // Dark Mode Script - lädt vor allem anderen um Flash zu vermeiden
      script: [
        {
          innerHTML: `
            (function() {
              const saved = localStorage.getItem('darkMode');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (saved === 'true' || (saved === null && prefersDark)) {
                document.documentElement.classList.add('dark');
              }
            })();
          `,
          type: "text/javascript",
        },
      ],
    },
  },

  devtools: { enabled: false },

  nitro: {
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    minify: true,
    routeRules: {
      "/_nuxt/**": {
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      },
      "/fonts/**": {
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      },
    },
  },

  modules: [
    "@primevue/nuxt-module",
    "@pinia/nuxt",
    "@nuxtjs/tailwindcss",
  ],

  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],

  css: ["~/assets/primeicons-subset.css", "~/assets/theme.css"],

  primevue: {
    autoImport: true,
    components: {
      prefix: "Prime",
      include: [
        "Button",
        "Dialog",
        "ProgressSpinner",
      ],
    },
    importTheme: {
      as: "PrimeVueTheme",
      from: primevueThemePath,
    },
    options: {
      locale: {
        firstDayOfWeek: 1,
        dayNames: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
        dayNamesShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
        dayNamesMin: ["S", "M", "D", "M", "D", "F", "S"],
        monthNames: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
        monthNamesShort: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
        fileSizeTypes: ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
      },
      ripple: true,
      inputVariant: "filled",
    },
  },
});
