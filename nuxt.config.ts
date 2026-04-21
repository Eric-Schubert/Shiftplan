import fs from "fs";
import path from "path";
import Aura from "@primevue/themes/aura";
import { definePreset } from "@primevue/themes";

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

const BrandPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#fff1f2",
      100: "#ffe2e5",
      200: "#ffc8cd",
      300: "#ff9aa5",
      400: "#ff6674",
      500: "#e30613",
      600: "#c70512",
      700: "#a70410",
      800: "#88050f",
      900: "#69050d",
      950: "#3b0206",
    },
    colorScheme: {
      light: {
        primary: {
          color: "{primary.500}",
          contrastColor: "#f8f5f5",
          hoverColor: "{primary.600}",
          activeColor: "{primary.700}",
        },
      },
      dark: {
        primary: {
          color: "{primary.400}",
          contrastColor: "#14080a",
          hoverColor: "{primary.300}",
          activeColor: "{primary.200}",
        },
      },
    },
  },
});

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

  // Version aus .version als Runtime-Config bereitstellen
  runtimeConfig: {
    public: {
      appVersion: getAppVersion(),
    },
  },

  app: {
    head: {
      title: "Schichtplaner",
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "manifest", href: "/manifest.json" },
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

  devtools: { enabled: true },

  modules: [
    "@primevue/nuxt-module",
    "@nuxt/icon",
    "@pinia/nuxt",
    "@nuxtjs/tailwindcss",
  ],

  css: ["primeicons/primeicons.css", "~/assets/theme.css"],

  primevue: {
    autoImport: true,
    components: {
      prefix: "Prime",
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
      theme: {
        preset: BrandPreset,
        options: {
          prefix: "p",
          darkModeSelector: ".dark",
          cssLayer: false,
        },
      },
    },
  },
});
