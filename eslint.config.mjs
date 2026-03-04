import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  Event: "readonly",
  CustomEvent: "readonly",
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
  // Base JS recommended rules
  js.configs.recommended,

  // Globale ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/.cache/**",
      "**/public/**",
      "**/allure-report/**",
      "**/allure-results/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/src/index.js",
      "**/functions/**",
      "**/archive/**",
      "**/archive-*/**",
      "**/supabase/functions/**",
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
      ".vercel/**",
      "seed*.js",
      "seed*.mjs",
      "seed*.cjs",
      "seed*.sql",
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
      // Slå av base no-unused-vars, bruk @typescript-eslint versjonen
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
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
        "warn",
        {
          fixToUnknown: true,
          ignoreRestArgs: false,
        },
      ],
      // TypeScript - unused vars - tillat _ prefix
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
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
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // Next.js konfigurasjon - global (uten files restriction)
  {
    name: "nextjs-plugin",
    plugins: {
      "@next/next": nextPlugin,
    },
    settings: {
      next: {
        rootDir: ".",
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  // Generelle regler for alle JS/TS filer
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    ignores: ["lib/**/*.js"], // Ikke for CommonJS filer
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": "warn",
      "no-var": "error",
    },
  },

  // Override for test-filer
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
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
];

export default eslintConfig;
