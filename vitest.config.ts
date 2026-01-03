import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    // Sequentiell statt parallel - verhindert DB-Konflikte
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["server/services/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./"),
    },
  },
});
