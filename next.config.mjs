import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n.ts",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // VERCEL PRO OPTIMIZATIONS 2026-04-10
  // Plan: Pro ($20/month) - 90min builds, 3008MB memory, 1TB bandwidth
  
  // Explicitly pass Supabase env to client (NEXT_PUBLIC_* inlined at build time).
  // Helps when .env loading order or Edge/build context differs.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // PRO: Increased memory for builds (matches vercel.json function memory)
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 60 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
  
  // distDir removed to let Vercel handle output correctly
  // output removed - use default for Vercel App Router

  // Performance optimizations
  compress: true,

  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Cloudflare Pages compatibility
  // Note: API routes should not be affected by trailingSlash
  trailingSlash: undefined,  // Let Next.js handle it automatically

  // Transpile packages to avoid webpack issues
  transpilePackages: ["next-intl", "@tanstack/react-query", "styled-components", "sanity", "@sanity/vision", "next-sanity"],

  // Use Node.js runtime (Cloudflare Pages supports this via next-on-pages)
  // Individual API routes can opt into edge runtime if needed

  // ESLint config removed - handled by eslint.config.mjs (Next.js 16 standard)
  // TypeScript strict mode - build fails on errors
  typescript: {
    // TypeScript 6 strict mode - build fails on errors
    // Fixed ~70 type errors with proper typing (as any for Supabase compatibility where needed)
    ignoreBuildErrors: false,
  },

  // React Compiler - Automatic memoization (Next.js 16 stable)
  // Tidligere i experimental, nå top-level
  reactCompiler: true,

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
    // Partial Prerendering - Experimental feature for faster loads
    // ppr: true, // Enable when ready to test
    // Turbopack disabled - using webpack for better compatibility
    // turbo: {},
    // Reduce memory usage by limiting workers based on available memory
    memoryBasedWorkersCount: true,
    // Optimize package imports
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
      // rxjs: needs optimization to prevent barrel import errors
      "rxjs",
      "rxjs/operators",
    ],
  },

  // URL handling - REMOVED skipTrailingSlashRedirect as it may cause 404s

  // SEO: Canonical redirects with localePrefix: 'as-needed'
  // Norwegian (default) = no prefix, English = /en/ prefix
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
      // { source: "/:locale/innlogging", destination: "/:locale/login", permanent: true },
      { source: "/signup", destination: "/register", permanent: true },
      { source: "/:locale/signup", destination: "/:locale/register", permanent: true },
      { source: "/autotrade", destination: "/no/dashboard/auto-trade", permanent: true },
      { source: "/:locale/autotrade", destination: "/:locale/dashboard/auto-trade", permanent: true },
      // Paper-trading redirects - COMMENTED OUT to fix API routes
      // { source: "/paper-trading", destination: "/paper", permanent: true },
      // { source: "/:locale/paper-trading", destination: "/:locale/paper", permanent: true },
      // { source: "/paper-trading/:path*", destination: "/paper/:path*", permanent: true },
      // { source: "/:locale/paper-trading/:path*", destination: "/:locale/paper/:path*", permanent: true },

      // Legacy English root URLs → actual Norwegian pages (localePrefix: "always")
      { source: "/pricing", destination: "/no/priser", permanent: true },
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
      { source: "/:locale/dashbord", destination: "/:locale/dashboard", permanent: true },
      { source: "/marketplace", destination: "/no/marketplace", permanent: true },
      // /settings handled by middleware → /profile?tab=settings (linje 91)
      // Fallback if middleware is bypassed:
      { source: "/settings", destination: "/no/profile?tab=settings", permanent: true },
      { source: "/om", destination: "/no/om-oss", permanent: true },
      { source: "/trading", destination: "/no/dashboard/trade", permanent: true },
      { source: "/portfolio", destination: "/no/dashboard/portfolio", permanent: true },
      
      // Legacy auto-trade paths → dashboard/auto-trade (direct, no chain)
      { source: "/auto-trade", destination: "/no/dashboard/auto-trade", permanent: true },
      { source: "/auto-trade/:path*", destination: "/no/dashboard/auto-trade", permanent: true },
      // /auto-trading and /auto-trading-ai handled by middleware CANONICAL_REDIRECTS
      // (middleware runs first → /dashboard/auto-trade). No need to duplicate here.

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
      { source: "/simulator", destination: "/no/paper-trading", permanent: true },
      
      // API v1 Consolidation (Script 04 - Phase 1)
      // NOTE: Direct route.ts files still exist at the old paths, so these
      // redirects are dead code (Next.js serves the file, not the redirect).
      // Kept as comments for documentation until old route files are removed.
      // { source: "/api/trading/execute", destination: "/api/v1/trading/execute", permanent: true },
      // { source: "/api/trading/sessions/:path*", destination: "/api/v1/trading/sessions/:path*", permanent: true },
      // { source: "/api/trading/mode", destination: "/api/v1/trading/mode", permanent: true },
      // { source: "/api/webhooks/resend/:path*", destination: "/api/v1/webhooks/resend/:path*", permanent: true },
      // { source: "/api/cron/daily-summary", destination: "/api/v1/cron/daily-summary", permanent: true },
      // { source: "/api/cron/update-usdt-nok", destination: "/api/v1/cron/update-usdt-nok", permanent: true },
      // { source: "/api/cron/keepalive", destination: "/api/v1/cron/keepalive", permanent: true },
      // { source: "/api/notifications/:path*", destination: "/api/v1/notifications/:path*", permanent: true },
      // Webhooks/github — no direct route.ts exists, keep redirect
      { source: "/api/webhooks/github/:path*", destination: "/api/v1/webhooks/github/:path*", permanent: true },
      { source: "/:locale/simulator", destination: "/:locale/paper-trading", permanent: true },
      { source: "/:locale/settings", destination: "/:locale/profile?tab=settings", permanent: true },
      { source: "/:locale/om", destination: "/:locale/om-oss", permanent: true },
    ];
  },

  // Generate build ID to bust caches
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || Date.now().toString();
  },

  // Headers (optimized for security and performance)
  // NOTE: Content-Security-Policy is now handled by middleware (src/middleware.ts)
  // with nonce-based approach instead of 'unsafe-inline' for enhanced security
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // CSP header removed - handled by middleware with nonce-based approach
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
      // NOTE: Cache-Control headers moved to vercel.json to avoid Next.js warning
      // Vercel handles caching optimally via vercel.json config
    ];
  },
};

// Sentry bundler-plugin: source map upload + release mot temp-mapper (ENOTEMPTY på macOS).
// Kjør upload kun på Vercel (VERCEL=1) der bygg er kanonisk for prod.
// GitHub Actions kjører `npm run build` uten VERCEL — da hoppes upload over (samme som lokal `next build`).
// Tving av/på: SENTRY_UPLOAD_SOURCE_MAPS=true|false
// Sentry source maps: Upload only on Vercel builds (VERCEL=1)
// GitHub Actions skips upload (no VERCEL env)
// Override: SENTRY_UPLOAD_SOURCE_MAPS=true|false
const sentryShouldUpload = process.env.SENTRY_UPLOAD_SOURCE_MAPS === 'true' || 
  (process.env.VERCEL === '1' && process.env.SENTRY_UPLOAD_SOURCE_MAPS !== 'false');

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
// Trigger rebuild 1775646351
// Deploy 1775648664
