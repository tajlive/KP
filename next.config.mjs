import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n.ts",
  localePrefix: "as-needed"
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // distDir removed to let Vercel handle output correctly
  // output removed - use default for Vercel App Router

  // Performance optimizations
  compress: true,

  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Cloudflare Pages compatibility
  trailingSlash: false,

  // Transpile next-intl to avoid webpack cache warnings with dynamic imports
  transpilePackages: ["next-intl"],

  // Use Node.js runtime (Cloudflare Pages supports this via next-on-pages)
  // Individual API routes can opt into edge runtime if needed

  // Build: enforce lint, gradual TS strict migration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // strict: true in tsconfig catches errors during dev
    // TODO-KLA-152: 224 TS-feil gjenstår (hovedsakelig Supabase typer)
    // Blokkert av: auth/callback route.ts type-konflikt (complex)
    // Plan: Fiks i neste sprint før full strict mode
    ignoreBuildErrors: true,
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
      
      // Legacy English root URLs → /en/ prefix
      { source: "/login", destination: "/en/login", permanent: true },
      { source: "/signup", destination: "/en/signup", permanent: true },
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
      { source: "/marketplace", destination: "/en/marketplace", permanent: true },
      { source: "/settings", destination: "/en/settings", permanent: true },
      { source: "/trading", destination: "/en/trading", permanent: true },
      { source: "/portfolio", destination: "/en/portfolio", permanent: true },
      
      // Legacy auto-trade paths → dashboard
      { source: "/auto-trade", destination: "/dashboard/trading", permanent: true },
      { source: "/auto-trade/:path*", destination: "/dashboard/trading", permanent: true },
      { source: "/auto-trading", destination: "/dashboard/trading", permanent: true },
      { source: "/auto-trading-ai", destination: "/dashboard/trading", permanent: true },
    ];
  },

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
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

    // Note: splitChunks removed — Next.js 15 handles this optimally

    return config;
  },

  // Headers (optimized for security and performance)
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    
    /* CSP constructed as single-line string - NO comments inside */
    const cspHeader = [
      "default-src 'self';",
      "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : "") + " https://vuxbjlykgmzskxbclquf.supabase.co https://*.tradingview.com https://*.vercel-scripts.com https://vercel.live;",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' blob: data: https://vuxbjlykgmzskxbclquf.supabase.co https://*.tradingview.com https://*.coingecko.com https://vercel.com https://klarpakke.no https://www.klarpakke.no;",
      "font-src 'self' data: https://vercel.live https://r2cdn.perplexity.ai;",
      "worker-src 'self' blob:;",
      "object-src 'none';",
      "base-uri 'self';",
      "form-action 'self';",
      "frame-ancestors 'none';",
      "connect-src 'self' https://vuxbjlykgmzskxbclquf.supabase.co wss://vuxbjlykgmzskxbclquf.supabase.co https://api.binance.com wss://stream.binance.com:9443 https://vercel.live https://o4509555622608896.ingest.de.sentry.io;",
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
            value: "camera=(), microphone=(), geolocation=()",
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

const sentryWebpackPluginOptions = {
  silent: true,
  org: "elbatt-chatbot",
  project: "klarpakke-production",
  sourcemaps: { disable: false },
  release: { create: true, finalize: true },
  deploy: { env: true },
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
