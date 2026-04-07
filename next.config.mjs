import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n.ts",
  localePrefix: "as-needed"
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly pass Supabase env to client (NEXT_PUBLIC_* inlined at build time).
  // Helps when .env loading order or Edge/build context differs.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // distDir removed to let Vercel handle output correctly
  // output removed - use default for Vercel App Router

  // Performance optimizations
  compress: true,

  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Cloudflare Pages compatibility
  // Note: API routes should not be affected by trailingSlash
  trailingSlash: false,

  // Transpile next-intl and @tanstack/react-query to avoid webpack "reading 'call'" issues
  transpilePackages: ["next-intl", "@tanstack/react-query"],

  // Use Node.js runtime (Cloudflare Pages supports this via next-on-pages)
  // Individual API routes can opt into edge runtime if needed

  // Build: lint kjører under build (2026-standard). I CI som allerede kjører lint kan
  // SKIP_LINT_IN_BUILD=true settes for å unngå dobbel lint og redusere build-tid (KLA-167).
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_LINT_IN_BUILD === "true",
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Production optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Image optimization (Vercel håndterer dette automatisk)
  images: {
    unoptimized: false, // La Vercel optimalisere bilder
    minimumCacheTTL: 2592000, // 30 dager cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vuxbjlykgmzskxbclquf.supabase.co",
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
    ],
  },

  // Static page generation timeout (important for large sites)
  staticPageGenerationTimeout: 120,

  // Experimental optimizations - DISABLED for Vercel compatibility
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "recharts",
      "lightweight-charts",
      // zustand: behold utenfor optimize — transform kan trigge default-export-interop
      // og [DEPRECATED] create-default-advarsel i prod-bundle (instrument-chunk).
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },

  // URL handling - REMOVED skipTrailingSlashRedirect as it may cause 404s

  // SEO: Canonical redirects with localePrefix: 'as-needed'
  // Norwegian (default) = no prefix, English = /en/ prefix
  async rewrites() {
    return [
      // Lesson routes - map to lesson page
      { source: '/leksjon/:lessonId', destination: '/leksjon/[lessonId]' },
    ];
  },

  async redirects() {
    return [
      // NOTE: /no/ redirect removed to fix lesson routes (KLA-156)
      // { source: "/no/:path*", destination: "/:path*", permanent: true },
      // { source: "/no", destination: "/", permanent: true },
      
      // Route consolidation redirects (2026)
      { source: "/innlogging", destination: "/login", permanent: true },
      { source: "/:locale/innlogging", destination: "/:locale/login", permanent: true },
      { source: "/signup", destination: "/register", permanent: true },
      { source: "/:locale/signup", destination: "/:locale/register", permanent: true },
      { source: "/autotrade", destination: "/auto", permanent: true },
      { source: "/:locale/autotrade", destination: "/:locale/auto", permanent: true },
      { source: "/autotrade/:path*", destination: "/auto/:path*", permanent: true },
      { source: "/:locale/autotrade/:path*", destination: "/:locale/auto/:path*", permanent: true },
      { source: "/paper-trading", destination: "/paper", permanent: true },
      { source: "/:locale/paper-trading", destination: "/:locale/paper", permanent: true },
      { source: "/paper-trading/:path*", destination: "/paper/:path*", permanent: true },
      { source: "/:locale/paper-trading/:path*", destination: "/:locale/paper/:path*", permanent: true },

      // Legacy English root URLs → /en/ prefix
      { source: "/pricing", destination: "/en/pricing", permanent: true },
      { source: "/courses", destination: "/en/courses", permanent: true },
      { source: "/courses/:path*", destination: "/en/courses/:path*", permanent: true },
      { source: "/course/:path*", destination: "/en/course/:path*", permanent: true },
      { source: "/about", destination: "/en/about", permanent: true },
      { source: "/contact", destination: "/en/contact", permanent: true },
      { source: "/privacy", destination: "/en/privacy", permanent: true },
      { source: "/terms", destination: "/en/terms", permanent: true },
      { source: "/blog", destination: "/en/blog", permanent: true },
      { source: "/blog/:path*", destination: "/en/blog/:path*", permanent: true },
      { source: "/dashboard", destination: "/en/dashboard", permanent: true },
      // Typo: Norwegian "dashbord" → correct path "dashboard"
      { source: "/dashbord", destination: "/no/dashboard", permanent: true },
      { source: "/:locale/dashbord", destination: "/:locale/dashboard", permanent: true },
      { source: "/marketplace", destination: "/en/marketplace", permanent: true },
      { source: "/settings", destination: "/innstillinger", permanent: true },
      { source: "/trading", destination: "/en/trading", permanent: true },
      { source: "/portfolio", destination: "/en/portfolio", permanent: true },
      
      // Legacy auto-trade paths → dashboard
      { source: "/auto-trade", destination: "/dashboard/trading", permanent: true },
      { source: "/auto-trade/:path*", destination: "/dashboard/trading", permanent: true },
      { source: "/auto-trading", destination: "/dashboard/trading", permanent: true },
      { source: "/auto-trading-ai", destination: "/dashboard/trading", permanent: true },

      // Consolidated routes
      { source: "/admin-dashboard", destination: "/admin", permanent: true },
      { source: "/:locale/admin-dashboard", destination: "/:locale/admin", permanent: true },
      { source: "/leaderboard-preview", destination: "/leaderboard", permanent: true },
      { source: "/:locale/leaderboard-preview", destination: "/:locale/leaderboard", permanent: true },
      { source: "/super-admin", destination: "/admin", permanent: true },
      { source: "/:locale/super-admin", destination: "/:locale/admin", permanent: true },
      
      // Deleted routes → redirect to appropriate pages
      { source: "/beta-testing", destination: "/beta", permanent: true },
      { source: "/:locale/beta-testing", destination: "/:locale/beta", permanent: true },
      { source: "/signals", destination: "/dashboard", permanent: true },
      { source: "/:locale/signals", destination: "/:locale/dashboard", permanent: true },
      { source: "/simulator", destination: "/paper", permanent: true },
      
      // API v1 Consolidation (Script 04 - Phase 1)
      // Trading APIs (exclude v3 which is new)
      { source: "/api/trading/execute", destination: "/api/v1/trading/execute", permanent: true },
      { source: "/api/trading/sessions/:path*", destination: "/api/v1/trading/sessions/:path*", permanent: true },
      { source: "/api/trading/mode", destination: "/api/v1/trading/mode", permanent: true },
      { source: "/api/paper-trading/:path*", destination: "/api/v1/trading/:path*?mode=paper", permanent: true },
      // Webhooks (except Stripe - keep original for signature verification)
      { source: "/api/webhooks/resend/:path*", destination: "/api/v1/webhooks/resend/:path*", permanent: true },
      { source: "/api/webhooks/github/:path*", destination: "/api/v1/webhooks/github/:path*", permanent: true },
      // Cron jobs
      { source: "/api/cron/:path*", destination: "/api/v1/cron/:path*", permanent: true },
      // Notifications
      { source: "/api/notifications/:path*", destination: "/api/v1/notifications/:path*", permanent: true },
      { source: "/:locale/simulator", destination: "/:locale/paper-trading", permanent: true },
      { source: "/:locale/settings", destination: "/:locale/innstillinger", permanent: true },
    ];
  },

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Reduce Vercel build log noise: next-intl extractor uses dynamic import(t)
    // which webpack cannot statically parse (cache invalidation warning).
    // Serializing big strings warning is from webpack cache; we use gzip.
    // Prod build + lokal dev under Playwright (PLAYWRIGHT_WEBPACK_QUIET=1 fra playwright.config)
    if (
      (process.env.NODE_ENV === "production" && !dev) ||
      (dev && process.env.PLAYWRIGHT_WEBPACK_QUIET === "1")
    ) {
      config.infrastructureLogging = { level: "error" };
    }

    // Ensure path aliases work correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": "./src",
    };

    // Client-side polyfills
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Suppress next-intl dynamic import cache warnings
    // Fixes: webpack.cache.PackFileCacheStrategy warning for extractor/format/index.js
    config.module = config.module || {};
    config.module.unknownContextCritical = false;
    config.module.exprContextCritical = false;

    // Webpack cache optimization to fix "Serializing big strings" warning
    if (!config.cache) {
      config.cache = {
        type: 'filesystem',
        compression: 'gzip',
      };
    }

    // Exclude opik from webpack bundling to avoid zod version conflicts
    // Opik is loaded dynamically at runtime
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push('opik');
    }

    // Note: splitChunks removed — Next.js 15 handles this optimally

    return config;
  },

  // Headers (optimized for security and performance)
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    /* Lokale WS (HMR, Turbo, Console Ninja m.m.) — kun dev; prod beholdes streng */
    const devLocalWs =
      " ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*";

    /* CSP constructed as single-line string - NO comments inside */
    const cspHeader = [
      "default-src 'self';",
      "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : "") + " https://vuxbjlykgmzskxbclquf.supabase.co https://*.tradingview.com https://*.vercel-scripts.com https://vercel.live https://plausible.io;",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' blob: data: https://vuxbjlykgmzskxbclquf.supabase.co https://*.tradingview.com https://*.coingecko.com https://vercel.com https://klarpakke.no https://www.klarpakke.no;",
      "font-src 'self' data: https://vercel.live https://r2cdn.perplexity.ai;",
      "worker-src 'self' blob:;",
      "object-src 'none';",
      "base-uri 'self';",
      "form-action 'self';",
      "frame-ancestors 'none';",
      "connect-src 'self' https://vuxbjlykgmzskxbclquf.supabase.co wss://vuxbjlykgmzskxbclquf.supabase.co https://api.binance.com wss://stream.binance.com:9443 https://vercel.live https://plausible.io https://o4509555622608896.ingest.de.sentry.io" +
        (isDev ? devLocalWs : "") +
        ";",
      "frame-src https://vercel.live;",
      "upgrade-insecure-requests;",
    ].join(" ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
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
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

// Sentry bundler-plugin: source map upload + release mot temp-mapper (ENOTEMPTY på macOS).
// Kjør upload kun på Vercel (VERCEL=1) der bygg er kanonisk for prod.
// GitHub Actions kjører `npm run build` uten VERCEL — da hoppes upload over (samme som lokal `next build`).
// Tving av/på: SENTRY_UPLOAD_SOURCE_MAPS=true|false
const sentryShouldUpload =
  process.env.SENTRY_UPLOAD_SOURCE_MAPS !== "false" &&
  (process.env.VERCEL === "1" ||
    process.env.SENTRY_UPLOAD_SOURCE_MAPS === "true");

const sentryWebpackPluginOptions = {
  silent: true,
  org: "elbatt-chatbot",
  project: "klarpakke-production",
  sourcemaps: { disable: !sentryShouldUpload },
  release: { create: sentryShouldUpload, finalize: sentryShouldUpload },
  deploy: { env: sentryShouldUpload },
  telemetry: false,
  tunnelRoute: "/api/sentry",
  hideSourceMaps: true,
  widenClientFileUpload: true,
  // NOTE: Do NOT add disableClientWebpackPlugin — it does not work in v8
  // NOTE: Do NOT add autoInstrumentAppDirectory — causes build failures
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeReplayWorker: true,
  },
  // automaticVercelMonitors moved to webpack config (deprecated in sentryWebpackPluginOptions)
};

// Bundle Analyzer configuration
import withBundleAnalyzer from "@next/bundle-analyzer";
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Export with NextIntl + Bundle Analyzer + Sentry
// Note: Sentry client-side init is now controlled by sentry.client.config.ts
// which skips initialization on marketing routes
export default withSentryConfig(
  withAnalyzer(withNextIntl(nextConfig)),
  sentryWebpackPluginOptions,
);
