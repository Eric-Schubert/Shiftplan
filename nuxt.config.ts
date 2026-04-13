import fs from "fs";
import path from "path";
import Aura from "@primevue/themes/aura";

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

  css: ["primeicons/primeicons.css"],

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
        preset: Aura,
        options: {
          prefix: "p",
          darkModeSelector: ".dark",
          cssLayer: false,
        },
      },
    },
  },
});
