import type { NuxtConfig } from "nuxt/schema";

export const nitroConfig: NuxtConfig["nitro"] = {
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
    "/sw.js": {
      headers: {
        "cache-control": "no-cache",
      },
    },
  },
};
