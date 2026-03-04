import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

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

  // Use Node.js runtime (Cloudflare Pages supports this via next-on-pages)
  // Individual API routes can opt into edge runtime if needed

  // Build: enforce lint, gradual TS strict migration
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    // strict: true in tsconfig catches errors during dev
    // Re-enabled until ~40 legacy strict-null errors are resolved
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

    // Note: splitChunks removed — Next.js 15 handles this optimally

    return config;
  },

  // Headers (optimized for security and performance)
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://vuxbjlykgmzskxbclquf.supabase.co https://*.tradingview.com https://*.vercel-scripts.com https://vercel.live;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://vuxbjlykgmzskxbclquf.supabase.co https://*.tradingview.com https://*.coingecko.com;
      font-src 'self' data:;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      connect-src 'self' https://vuxbjlykgmzskxbclquf.supabase.co wss://vuxbjlykgmzskxbclquf.supabase.co https://api.binance.com wss://stream.binance.com:9443 https://vercel.live;
      frame-src https://vercel.live;
      upgrade-insecure-requests;
    `;

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader
              .replace(/\n/g, "")
              .replace(/\s{2,}/g, " ")
              .trim(),
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

      // Cache static assets forever (they have hash in filename)
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache images for 1 month
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

// Sentry configuration
const sentryWebpackPluginOptions = {
  silent: true,
  org: "klarpakke",
  project: "klarpakke-web",

  // Enable sourcemaps for production debugging
  sourcemaps: { disable: false },
  release: { create: true, finalize: true },
  deploy: { env: true },
  telemetry: false,

  // Route browser requests to Sentry through a Next.js rewrite
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  widenClientFileUpload: true,
};

// Bundle Analyzer configuration
import withBundleAnalyzer from "@next/bundle-analyzer";
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Export with NextIntl + Bundle Analyzer + Sentry
export default withSentryConfig(
  withAnalyzer(withNextIntl(nextConfig)),
  sentryWebpackPluginOptions,
);
