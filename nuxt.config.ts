import Aura from "@primevue/themes/aura";

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

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
