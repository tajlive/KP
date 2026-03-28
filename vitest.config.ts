import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Inkluder kun unit/component-tester – Playwright e2e kjøres separat
    include: ["src/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: ["node_modules/**", "tests/e2e/**", "tests/smoke/**", "e2e/**", "**/*.d.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Terskel ~25 % — økes gradvis (AGENTS.md / TYPE-DEBT-ROADMAP-2026).
      thresholds: {
        lines: 25,
        functions: 25,
        branches: 25,
        statements: 25,
      },
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(
        __dirname,
        "./src/test/mocks/server-only-stub.ts",
      ),
    },
  },
});
