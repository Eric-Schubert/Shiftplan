import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  // Compiles .vue files for the tests that render components (tests/helpers/legal-render.ts).
  plugins: [vue()],
  test: {
    include: ["tests/**/*.test.ts"],

    pool: "forks",
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "~": resolve(import.meta.dirname, "./"),
    },
  },
});
