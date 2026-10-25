import { defineConfig } from "vitest/config";

// Pure-logic unit tests only (math, ciphers, JWT, fuzzy match, WM-adjacent
// helpers, etc.) - no Svelte component tests, so no svelte plugin needed.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
