import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],

    pool: "forks",
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./"),
    },
  },
});
