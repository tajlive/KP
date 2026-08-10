import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n.ts",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // BUILD OPTIMIZATIONS 2026-04-10
  // Tuned for Cloudflare Workers + OpenNext builds
  
  // Explicitly pass Supabase env to client (NEXT_PUBLIC_* inlined at build time).
  // Helps when .env loading order or Edge/build context differs.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // PRO: Increased memory for builds (matches Cloudflare Workers memory target)
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 60 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
  
  // distDir: 'dist',
  output: 'standalone', // Required by the OpenNext/Workers build pipeline

  // Performance optimizations
  compress: true,

  poweredByHeader: false,

  productionBrowserSourceMaps: false, // Sentry får source maps via withSentryConfig
  // Cloudflare Workers/OpenNext routing compatibility
  // Note: API routes should not be affected by trailingSlash
  trailingSlash: undefined,  // Let Next.js handle it automatically

  // Transpile packages to avoid webpack issues
  transpilePackages: ["next-intl", "@tanstack/react-query", "styled-components", "sanity", "@sanity/vision", "next-sanity"],

  // Default runtime is handled by OpenNext/Workers.
  // Individual API routes can opt into edge runtime if needed

  // ESLint config removed - handled by eslint.config.mjs (Next.js 16 standard)
  // TypeScript strict mode - build fails on errors
  typescript: {
    // TypeScript 6 strict mode - build fails on errors
    // Fixed ~70 type errors with proper typing (as any for Supabase compatibility where needed)
    ignoreBuildErrors: false,
  },

  // Include Cloudflare workerd-specific files for OpenNext build
  outputFileTracingIncludes: {
    "**/*": [
      "./node_modules/pg-cloudflare/dist/**",
      "./node_modules/pg-cloudflare/esm/**",
      "./node_modules/xxhash-wasm/workerd/**",
      "./node_modules/xxhash-wasm/esm/**",
      "./node_modules/xxhash-wasm/cjs/**",
    ],
  },
  outputFileTracingExcludes: {
    "**/*": [
      "./node_modules/opik/**",
      "./node_modules/boxen/**",
      "./node_modules/ora/**",
      "./node_modules/log-symbols/**",
      "./node_modules/widest-line/**",
      "./node_modules/ansi-align/**",
      "./node_modules/cli-spinners/**",
    ],
  },

  // React Compiler - Automatic memoization (Next.js 16 stable)
  // Tidligere i experimental, nå top-level
  reactCompiler: true,

  // Disable Next.js dev indicator during E2E / Lighthouse runs
  // so it does not overlay the bottom navigation.
  devIndicators: false,

  // Production optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Image optimization
  // Cloudflare Workers + Images: custom loader når CLOUDFLARE_IMAGES_ACCOUNT_HASH er satt.
  // Uten Images-hash bruker appen uoptimaliserte bilder for kompatibilitet i workerd.
  images: {
    unoptimized:
      (!process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH && !process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH),
    loader: process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH ? "custom" : undefined,
    loaderFile: process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH
      ? "./src/lib/cloudflare-images-loader.ts"
      : undefined,
    minimumCacheTTL: 2592000, // 30 dager cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pskhryjzkobytnfwucrb.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.tradingview.com",
      },
      {
        protocol: "https",
        hostname: "**.coingecko.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },

  // Static page generation timeout (important for large sites)
  staticPageGenerationTimeout: 120,
  
  // Consolidated webpack configuration (merged from both sections)
  webpack: (config, { isServer, dev, nextRuntime }) => {
    // 1. Exclude native modules from client bundle (Turbopack compatibility)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fsevents: false,
        chokidar: false,
        nunjucks: false,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // 2. Exclude problematic packages from webpack bundling
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push('fsevents', 'chokidar', 'nunjucks', 'opik');
    }

    // 3. Memory optimization: split chunks
    config.optimization = {
      ...config.optimization,
      minimize: true,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      },
    };

    // 4. Reduce build log noise (next-intl dynamic import warnings)
    if (
      (process.env.NODE_ENV === "production" && !dev) ||
      (dev && process.env.PLAYWRIGHT_WEBPACK_QUIET === "1")
    ) {
      config.infrastructureLogging = { level: "error" };
    }

    // 5. Path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": "./src",
    };

    // 6. Webpack cache optimization
    if (!config.cache) {
      config.cache = {
        type: 'filesystem',
        compression: 'gzip',
      };
    }

    // 7. Suppress module warnings
    config.module = config.module || {};
    config.module.unknownContextCritical = false;
    config.module.exprContextCritical = false;

    return config;
  },

  // Server external packages - don't bundle these
  serverExternalPackages: [
    'opik',
    'fsevents',
    'chokidar',
    'nunjucks',
  ],

  // Experimental optimizations
  experimental: {
    // cacheComponents — PPR. Må fjerne alle force-dynamic fra ruter (inkompatibelt).
    // Aktiveres når API-rutene er migrert til lazy supabase init.
    // cacheComponents: true,
    // View Transitions — smooth page transitions (Next.js 16 built-in)
    viewTransition: true,
    // TODO: Migrer til Turbopack når Supabase SSR er kompatibel
    // Reduce memory usage by limiting workers based on available memory
    memoryBasedWorkersCount: true,
    // Optimize package imports
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "recharts",
      "lightweight-charts",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "rxjs",
      "rxjs/operators",
      // NEW — high impact
      "@coinbase/cds-web",
      "@radix-ui/react-slot",
      "sonner",
      "next-themes",
      "react-ts-tradingview-widgets",
      "embla-carousel-react",
      "react-resizable-panels",
      "vaul",
      "cmdk",
      "input-otp",
      "react-day-picker",
      "@hookform/resolvers",
      "react-hook-form",
      "zustand",
      "immer",
    ],
  },

  // URL handling - REMOVED skipTrailingSlashRedirect as it may cause 404s

  // SEO: Canonical redirects with localePrefix: 'always'
  // Both Norwegian (/no/) and English (/en/) get prefixes
  async rewrites() {
    return [
      // Paper-trading API - rewrite to bypass any redirects
      { source: '/api/paper-trading/:path*', destination: '/api/paper-trading/:path*' },
      // Lesson routes - map to lesson page
      { source: '/leksjon/:lessonId', destination: '/leksjon/[lessonId]' },
    ];
  },

  async redirects() {
    return [
      // Auth redirects - /login → /no/login (fix for broken auth links)
      { source: "/login", destination: "/no/login", permanent: true },
      { source: "/register", destination: "/no/register", permanent: true },
      
      // NOTE: /no/ redirect removed to fix lesson routes (KLA-156)
      // { source: "/no/:path*", destination: "/:path*", permanent: true },
      // { source: "/no", destination: "/", permanent: true },
      
      // Route consolidation redirects (2026)
      // Fjernet - håndteres av i18n middleware (linje 20 i i18n.ts)
      // { source: "/innlogging", destination: "/login", permanent: true },
      // { source: "/:locale(no|en)/innlogging", destination: "/:locale(no|en)/login", permanent: true },
      { source: "/signup", destination: "/register", permanent: true },
      { source: "/:locale(no|en)/signup", destination: "/:locale(no|en)/register", permanent: true },
      { source: "/autotrade", destination: "/no/dashboard/auto-trade", permanent: true },
      { source: "/:locale(no|en)/autotrade", destination: "/:locale(no|en)/dashboard/auto-trade", permanent: true },
      // Trading route unification: canonical /handel
      { source: "/paper-trading", destination: "/handel", permanent: true },
      { source: "/:locale(no|en)/paper-trading", destination: "/:locale(no|en)/handel", permanent: true },
      { source: "/paper-trading/:path*", destination: "/handel", permanent: true },
      { source: "/:locale(no|en)/paper-trading/:path*", destination: "/:locale(no|en)/handel", permanent: true },
      { source: "/live-trading", destination: "/handel?mode=live", permanent: true },
      { source: "/:locale(no|en)/live-trading", destination: "/:locale(no|en)/handel?mode=live", permanent: true },

      // Legacy English slugs med locale-prefiks → norske sider (dekket ellers
      // av [...slug] catch-all som rendrer not-found med HTTP 200)
      { source: "/:locale(no|en)/pricing", destination: "/:locale(no|en)/priser", permanent: true },
      { source: "/:locale(no|en)/learn", destination: "/:locale(no|en)/kurs", permanent: true },
      { source: "/:locale(no|en)/about", destination: "/:locale(no|en)/om-oss", permanent: true },

      // Legacy English root URLs → actual Norwegian pages (localePrefix: "always")
      { source: "/pricing", destination: "/no/priser", permanent: true },
      { source: "/learn", destination: "/no/kurs", permanent: true },
      { source: "/courses", destination: "/no/kurs", permanent: true },
      { source: "/courses/:path*", destination: "/no/kurs/:path*", permanent: true },
      { source: "/course/:path*", destination: "/no/kurs/:path*", permanent: true },
      { source: "/about", destination: "/no/om-oss", permanent: true },
      { source: "/contact", destination: "/no/kontakt", permanent: true },
      { source: "/privacy", destination: "/no/personvern", permanent: true },
      { source: "/terms", destination: "/no/vilkar", permanent: true },
      // /blog — no blog pages exist yet; redirect to landing
      { source: "/blog", destination: "/no", permanent: false },
      { source: "/blog/:path*", destination: "/no", permanent: false },
      // Typo: Norwegian "dashbord" → correct path "dashboard"
      { source: "/dashbord", destination: "/no/dashboard", permanent: true },
      { source: "/:locale(no|en)/dashbord", destination: "/:locale(no|en)/dashboard", permanent: true },
      { source: "/marketplace", destination: "/no/marketplace", permanent: true },
      // /settings handled by proxy → /profile?tab=settings (linje 91)
      // Fallback if proxy is bypassed:
      { source: "/settings", destination: "/no/profile?tab=settings", permanent: true },
      { source: "/om", destination: "/no/om-oss", permanent: true },
      { source: "/trading", destination: "/no/dashboard/trade", permanent: true },
      { source: "/portfolio", destination: "/no/dashboard/portfolio", permanent: true },
      
      // /dashboard/auto-handel is a legacy alias handled by middleware → /dashboard/auto-trade.
      // Do NOT add Next.js redirects from /dashboard/auto-trade here; the real page lives there.
      // Legacy auto-trade paths → dashboard/auto-trade (direct, no chain)
      { source: "/auto-trade", destination: "/no/dashboard/auto-trade", permanent: true },
      { source: "/auto-trade/:path*", destination: "/no/dashboard/auto-trade", permanent: true },
      // Handelshistorikk → dashboard/historikk canonical
      { source: "/handelshistorikk", destination: "/dashboard/historikk", permanent: true },
      { source: "/:locale(no|en)/handelshistorikk", destination: "/:locale(no|en)/dashboard/historikk", permanent: true },
      // /auto-trading and /auto-trading-ai handled by proxy CANONICAL_REDIRECTS
      // (proxy runs first → /dashboard/auto-trade). No need to duplicate here.

      // Consolidated routes
      { source: "/admin-dashboard", destination: "/admin", permanent: true },
      { source: "/:locale(no|en)/admin-dashboard", destination: "/:locale(no|en)/admin", permanent: true },
      { source: "/leaderboard-preview", destination: "/leaderboard", permanent: true },
      { source: "/:locale(no|en)/leaderboard-preview", destination: "/:locale(no|en)/leaderboard", permanent: true },
      { source: "/super-admin", destination: "/admin", permanent: true },
      { source: "/:locale(no|en)/super-admin", destination: "/:locale(no|en)/admin", permanent: true },
      
      // Deleted routes → redirect to appropriate pages
      { source: "/beta-testing", destination: "/no/dashboard", permanent: true },
      { source: "/:locale(no|en)/beta-testing", destination: "/:locale(no|en)/dashboard", permanent: true },
      { source: "/signals", destination: "/dashboard", permanent: true },
      { source: "/:locale(no|en)/signals", destination: "/:locale(no|en)/dashboard", permanent: true },
      { source: "/simulator", destination: "/no/paper-trading", permanent: true },
      
      // API v1 Consolidation (Script 04 - Phase 1)
      // Webhooks/github — no direct route.ts exists, keep redirect
      { source: "/api/webhooks/github/:path*", destination: "/api/v1/webhooks/github/:path*", permanent: true },
      { source: "/:locale(no|en)/simulator", destination: "/:locale(no|en)/paper-trading", permanent: true },
      { source: "/:locale(no|en)/settings", destination: "/:locale(no|en)/profile?tab=settings", permanent: true },
      { source: "/:locale(no|en)/om", destination: "/:locale(no|en)/om-oss", permanent: true },
      { source: "/konto", destination: "/no/profile?tab=wallet", permanent: true },
      { source: "/:locale(no|en)/konto", destination: "/:locale(no|en)/profile?tab=wallet", permanent: true },
      { source: "/innstillinger", destination: "/no/profile?tab=settings", permanent: true },
      { source: "/:locale(no|en)/innstillinger", destination: "/:locale(no|en)/profile?tab=settings", permanent: true },
      // 2026-08-10 (QA P1): gamle e-poster lenker til /no/profil — 404 uten denne
      { source: "/profil", destination: "/no/profile", permanent: true },
      { source: "/:locale(no|en)/profil", destination: "/:locale(no|en)/profile", permanent: true },
    ];
  },

  // Generate build ID to bust caches
  // Prefer Cloudflare Workers Builds commit SHA, then other CI providers, then timestamp.
  generateBuildId: async () => {
    return process.env.WORKERS_CI_COMMIT_SHA?.slice(0, 7) ||
           process.env.COOLIFY_COMMIT_SHA?.slice(0, 7) ||
           process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) ||
           process.env.GITHUB_SHA?.slice(0, 7) ||
           Date.now().toString();
  },

  // Headers (optimized for security and performance)
  // NOTE: Content-Security-Policy is now handled by proxy (src/proxy.ts)
  // with nonce-based approach instead of 'unsafe-inline' for enhanced security
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // CSP header removed - handled by proxy with nonce-based approach
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          // SEO: Canonical URL for duplicate prevention
          {
            key: "Link",
            value: '<https://klarpakke.no/:path*>; rel="canonical"',
          },
        ],
      },
      // Studio: allow iframe loading (Sanity Studio uses internal iframes)
      {
        source: "/studio(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      // NOTE: Cache-Control headers handled by Cloudflare Workers/CDN
    ];
  },
};

// Sentry monitoring (auto-capture errors + performance)
import { withSentryConfig } from "@sentry/nextjs";

// Bundle Analyzer configuration
import withBundleAnalyzer from "@next/bundle-analyzer";
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Export with NextIntl + Bundle Analyzer + Sentry
const config = withAnalyzer(withNextIntl(nextConfig));
export default withSentryConfig(config, {
  // Upload source maps to Sentry for readable stack traces
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN, // Kun i CI
  },
});
// Trigger rebuild 1775646351
// Deploy 1775648664
