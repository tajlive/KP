import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

// Custom regel: advarsel ved høye ISR-verdier på sider som endres ofte
const noHighRevalidateRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Advarsel ved revalidate > 3600 på ofte-endrede ruter",
    },
    messages: {
      highRevalidate:
        "revalidate={{value}}s er for høyt for {{path}}. Bruk force-dynamic eller ≤60s for sider som endres ofte. Se AGENTS.md → Caching & ISR.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    const isPage = /page\.tsx$/.test(filename);
    const isHighChangeRoute =
      isPage &&
      !/(legal|vilkar|personvern|cookies|hjelp|quiz)\//.test(filename) &&
      !/\[\.\.\.slug\]/.test(filename);
    if (!isHighChangeRoute) return {};

    return {
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (!decl || decl.type !== "VariableDeclaration") return;
        for (const d of decl.declarations) {
          if (d.id?.name === "revalidate" && d.init?.type === "Literal") {
            const value = d.init.value;
            if (typeof value === "number" && value > 3600) {
              context.report({
                node: d,
                messageId: "highRevalidate",
                data: { value: String(value), path: filename },
              });
            }
          }
        }
      },
    };
  },
};

// Globale variabler for både Browser og Node.js
const commonGlobals = {
  // Browser globals
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  location: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  fetch: "readonly",
  Request: "readonly",
  Response: "readonly",
  Headers: "readonly",
  FormData: "readonly",
  Blob: "readonly",
  File: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  ResizeObserver: "readonly",
  IntersectionObserver: "readonly",
  MutationObserver: "readonly",
  HTMLElement: "readonly",
  HTMLDivElement: "readonly",
  HTMLInputElement: "readonly",
  HTMLButtonElement: "readonly",
  HTMLFormElement: "readonly",
  HTMLAnchorElement: "readonly",
  HTMLVideoElement: "readonly",
  HTMLSpanElement: "readonly",
  Element: "readonly",
  Node: "readonly",
  SVGSVGElement: "readonly",
  // Event types
  Event: "readonly",
  CustomEvent: "readonly",
  KeyboardEvent: "readonly",
  MouseEvent: "readonly",
  // Web API
  Worker: "readonly",
  PerformanceObserver: "readonly",
  PerformanceNavigationTiming: "readonly",
  performance: "readonly",
  ReadableStream: "readonly",
  HTMLImageElement: "readonly",
  // Notifications
  Notification: "readonly",
  NotificationPermission: "readonly",
  // Push API
  PushSubscription: "readonly",
  // Service Worker
  ServiceWorkerRegistration: "readonly",
  // Encoding
  atob: "readonly",
  btoa: "readonly",
  // Fetch
  RequestInit: "readonly",
  // Streams
  BufferSource: "readonly",
  DOMRect: "readonly",
  DOMTokenList: "readonly",
  CSSStyleDeclaration: "readonly",
  // Node.js globals
  process: "readonly",
  Buffer: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  global: "readonly",

  // Deno globals (for Edge Functions)
  Deno: "readonly",
  TextEncoder: "readonly",
  TextDecoder: "readonly",
  AbortController: "readonly",
  AbortSignal: "readonly",
  DOMException: "readonly",
  // Crypto
  crypto: "readonly",
  Crypto: "readonly",
  SubtleCrypto: "readonly",
  CryptoKey: "readonly",
  // WebSocket
  WebSocket: "readonly",
  // Node.js type namespaces
  NodeJS: "readonly",
  // React/Next.js globals
  React: "readonly",
  JSX: "readonly",
  // Browser UI
  alert: "readonly",
  confirm: "readonly",
  prompt: "readonly",
};

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // Next.js - ESLint 10 compatible config
  {
    name: "nextjs-core",
    plugins: {
      "@next/next": nextPlugin,
    },
    settings: { next: { rootDir: "." } },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  // Base JS recommended rules
  js.configs.recommended,

  // Globale ignores
  {
    ignores: [
      "**/node_modules/**",
      // .next*/.open-next* dekker også gamle build-copies (.next-old, .open-next-old)
      // — en 35 MB minifisert handler.mjs der OOMet eslint (2026-08-04)
      "**/.next*/**",
      "**/.open-next*/**",
      "**/.wrangler/**", // genererte deploy-bundles (35 MB minifisert worker.js)
      "**/.sanity/**",
      "**/out/",
      "**/.cache/**",
      "design-audit/**",
      "**/public/**",
      "**/allure-report/**",
      "**/allure-results/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/*.config.js",
      "**/scratch/**",
      "**/scripts/**",
      // Ikke ignorer eslint.config.mjs: Next.js build (runLintCheck) bruker
      // calculateConfigForFile på den filen; hvis den er ignorert, ser den ikke @next/next og viser advarsel.
      "**/next.config.mjs",
      "**/postcss.config.mjs",
      "**/tailwind.config.mjs",
      "**/src/index.js",
      "**/functions/**",
      "**/archive/**",
      "**/archive-*/**",
      "**/supabase/functions/**",
      "**/supabase/*.cjs",
      "**/supabase/*.js",
      "**/coverage/**",
      "**/playwright-report/**",
      "klarpakke-app/**",
      "klarpakke-mcp-server/**",
      "scripts/**",
      "mcp-server/**",
      "lib/ai-content-generator.js",
      "web/**",
      "workers/**",
      "dist/**",
      "build/**",
      "**/.hermes/**",
      "**/.worktrees/**",
      "seed*.js",
      "seed*.mjs",
      "seed*.cjs",
      "seed*.sql",
      "test-*.mjs",
      "*-test.mjs",
      "*-test.cjs",
      "*-test.js",
      ".chrome-profile.backup*/**",
      ".chrome-profile/**",
    ],
  },

  // CommonJS filer (lib/*.js) - disse bruker require/module.exports
  {
    files: ["lib/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...commonGlobals,
        require: "readonly",
        module: "readonly",
        exports: "readonly",
      },
    },
    rules: {
      // Tillat console i lib-filer
      "no-console": "off",
      // Unused vars som warnings ikke errors i lib-filer
      "no-unused-vars": "warn",
    },
  },

  // ESM JS-filer
  {
    files: ["**/*.js"],
    ignores: ["lib/**/*.js"],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      globals: commonGlobals,
    },
    rules: {
      // Tillat escapes i regex som kan være nødvendige
      "no-useless-escape": "off",
    },
  },

  // JSX filer - bruker samme parser config som TSX for JSX støtte
  {
    files: ["**/*.jsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: commonGlobals,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-useless-escape": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_|^e$|^err$|^error$|^req$|^res$|^request$|^user$|^payload$|^_.*",
          varsIgnorePattern: "^_|^_.*",
          caughtErrorsIgnorePattern: "^_|^e$|^err$|^error$|^_.*",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // TypeScript konfigurasjon
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: commonGlobals,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // TypeScript - disallow explicit any
      "@typescript-eslint/no-explicit-any": [
        "error",
        {
          fixToUnknown: true,
          ignoreRestArgs: false,
        },
      ],
      // TypeScript - unused vars: _ prefix, eller vanlige ubrukte navn (req, res, e i catch, etc.)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_|^e$|^err$|^error$|^req$|^res$|^request$|^user$|^payload$|^_.*",
          varsIgnorePattern: "^_|^_.*",
          caughtErrorsIgnorePattern: "^_|^e$|^err$|^error$|^_.*",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // Tillat @ts-ignore (vi har mye legacy kode)
      "@typescript-eslint/ban-ts-comment": "off",
      // Tillat tomme interface extensions (for React props mønster)
      "@typescript-eslint/no-empty-object-type": "off",
      // Tillat escapes i regex som kan være nødvendige
      "no-useless-escape": "off",
      // Tillat expressions som ikke er assignments (for React mønstere)
      "@typescript-eslint/no-unused-expressions": "off",
      // Tillat const/let i case blokker
      "no-case-declarations": "off",
      // Zustand v5: forby default import (deprecated)
      "no-restricted-imports": [
        "error",
        {
          "paths": [
            {
              "name": "zustand",
              "importNames": ["default"],
              "message": "Default export is deprecated. Use: import { create } from 'zustand'",
            },
          ],
        },
      ],
    },
  },

  // React konfigurasjon
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      react: reactPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "react/prop-types": "off", // Ikke nødvendig med TypeScript
      "react/react-in-jsx-scope": "off", // Next.js håndterer dette
      "react/no-unescaped-entities": "off",
    },
  },

  // React Hooks konfigurasjon
  {
    files: ["**/*.jsx", "**/*.tsx", "**/*.js", "**/*.ts"],
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      // exhaustive-deps: av for å unngå masse false positives; legg til deps kun der det er trygt
      "react-hooks/exhaustive-deps": "off",
    },
  },

  // Tilgjengelighet (a11y) – 2026 standard. Alle som "warn" for gradvis fiksing.
  {
    files: ["**/*.jsx", "**/*.tsx"],
    plugins: {
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      ...Object.fromEntries(
        Object.entries(jsxA11yPlugin.configs.recommended.rules).map(([k, v]) => [
          k,
          typeof v === "string" ? "warn" : Array.isArray(v) ? ["warn", ...(v.slice(1) || [])] : "warn",
        ])
      ),
      // Label: krever kun id ELLER nesting (htmlFor + id er gyldig a11y)
      "jsx-a11y/label-has-for": ["warn", { "required": { "some": ["nesting", "id"] } }],
    },
  },

  // Generelle regler for alle JS/TS filer
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    ignores: ["lib/**/*.js"], // Ikke for CommonJS filer
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
      "prefer-const": "warn",
      "no-var": "error",
    },
  },

  // Override for test-filer
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        vitest: "readonly",
        assert: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // Block console.log in production source code (use logger instead)
  // console.warn/error still allowed until full migration to logger.ts
  {
    name: "no-console-log-in-prod",
    files: [
      "src/app/**/*.ts",
      "src/app/**/*.tsx",
      "src/features/**/*.ts",
      "src/features/**/*.tsx",
      "src/lib/**/*.ts",
      "src/lib/**/*.tsx",
      "src/components/**/*.ts",
      "src/components/**/*.tsx",
      "src/hooks/**/*.ts",
      "src/hooks/**/*.tsx",
    ],
    ignores: [
      "src/app/**/error.tsx",
      "src/app/**/global-error.tsx",
      "src/lib/logger.ts",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    plugins: {
      "klarpakke": { rules: { "no-high-revalidate": noHighRevalidateRule } },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error", "debug", "info"] }],
      "klarpakke/no-high-revalidate": "warn",
    },
  },

// Unused vars av i src/e2e: prefiks med _ eller fjern når du rører koden. For streng sjekk: kjør eslint med --rule '@typescript-eslint/no-unused-vars: warn'
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.jsx", "e2e/**/*.ts", "tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // Override for archive/legacy filer
  {
    files: [
      "tests/e2e/_archive/**",
      "src/app/_archive/**",
      "src/app/api/_archive/**",
    ],
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
    },
  },

  // KLA-PROFIT1: Midlertidig override for legacy lint-gjeld
  // TODO: KLA-XXX Fjern dette når legacy filer er fikset
  {
    name: "kla-profit1-legacy-exemptions",
    files: [
      "playwright/global-setup.ts",
      "src/features/backtest/BacktestPanel.tsx",
      "src/features/funding/FundingArbitrageDashboard.tsx",
      "src/features/landing/LandingBacktestTeaser.tsx",
      "src/features/landing/ROISimulator.tsx",
      "src/features/trading/AggressivitySlider.tsx",
      "src/features/trading/OptimalTrader.tsx",
      "src/features/trading/TradeAmountSlider.tsx",
      "src/lib/monitoring/index.ts",
      "src/lib/paper-trading/supabase.ts",
      "src/lib/trading/confluent-signal-engine.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "jsx-a11y/label-has-associated-control": "off",
      "jsx-a11y/label-has-for": "off",
    },
  },
];

export default eslintConfig;
