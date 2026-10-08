import fs from "fs";
import path from "path";
import { appHead } from "./config/nuxt/head";
import { nitroConfig } from "./config/nuxt/nitro";
import { primevueLocale } from "./config/nuxt/primevue-locale";
import { publicRuntimeEnv } from "./config/nuxt/runtime";

function getAppVersion(): string {
  try {
    const versionFile = path.resolve(__dirname, ".version");
    return fs.readFileSync(versionFile, "utf-8").trim();
  } catch {
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
    client: false,
    server: false,
  },

  // Agent worktrees live in .claude/ and carry their own node_modules; watching them exhausts file handles.
  ignore: [".claude/**"],
  vite: {
    server: {
      watch: { ignored: ["**/.claude/**"] },
    },
  },

  runtimeConfig: {
    public: {
      appVersion: getAppVersion(),
      ...publicRuntimeEnv,
    },
  },

  app: {
    head: appHead,
  },

  devtools: { enabled: false },

  nitro: nitroConfig,

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
      locale: primevueLocale,
      ripple: true,
      inputVariant: "filled",
    },
  },
});
