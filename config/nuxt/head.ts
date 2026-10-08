import type { NuxtConfig } from "nuxt/schema";

export const appHead: NonNullable<NuxtConfig["app"]>["head"] = {
  htmlAttrs: {
    lang: "de",
  },
  title: "Shiftplan",
  meta: [
    {
      name: "description",
      content: "Shiftplan: Dienstplan im Browser planen, im Team per App ansehen.",
    },
  ],
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico", sizes: "48x48" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    { rel: "manifest", href: "/manifest.json" },
    {
      rel: "preload",
      href: "/fonts/public-sans-latin.woff2",
      as: "font",
      type: "font/woff2",
      crossorigin: "anonymous",
    },
  ],

  // Sets the dark class before the first paint to avoid a light flash.
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
};
