import { defineConfig } from "vitest/config";

/**
 * Vitest konfigurasjon for Node.js scripts
 * Bruker node-miljø (ikke jsdom) for CLI-verktøy
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["scripts/**/*.{test,spec}.ts"],
    exclude: ["node_modules/**", "**/*.d.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      exclude: ["node_modules/", "scripts/*.test.ts"],
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
