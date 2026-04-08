import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    
    // Optimalisering for hastighet
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        useAtomics: true,
        isolate: false, // Raskere, men deler minne mellom tester
      },
    },
    
    // Parallelisering
    fileParallelism: true,
    maxConcurrency: 8,
    
    // Inkluder kun unit/component-tester – Playwright e2e kjøres separat
    include: ["src/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: [
      "node_modules/**", 
      "tests/e2e/**", 
      "tests/smoke/**", 
      "e2e/**", 
      "**/*.d.ts",
      "**/p0-*.test.ts", // P0-tester krever DB, kjøres separat
    ],
    
    // Retry for flaky tester i CI
    retry: process.env.CI ? 2 : 0,
    
    // Timeout
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Rapportører
    reporters: process.env.CI 
      ? ["default", "junit"] 
      : ["default"],
    outputFile: process.env.CI 
      ? "./test-results/junit.xml" 
      : undefined,
    
    // Coverage
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
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
        "**/p0-*.test.ts",
      ],
    },
    
    // Minneoptimalisering
    maxWorkers: process.env.CI ? 2 : undefined,
    
    // Clear mocks mellom tester
    clearMocks: true,
    restoreMocks: true,
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
  // Bygg-optimalisering
  esbuild: {
    target: "es2022",
  },
});
