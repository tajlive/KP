/**
 * Sanity Environment Variables
 *
 * These variables are used by both the embedded Next.js Studio and
 * Sanity CLI builds. Fallback values are provided for CLI builds
 * (sanity deploy) which do not have access to Next.js env vars.
 *
 * Keep in sync with:
 * - sanity.cli.ts
 * - .env.local
 * - sanity.config.ts (root)
 */

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage)
  }
  return v
}

export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-04-07'

// Fallbacks for deployed studio (sanity deploy) which does not have access
// to Next.js environment variables at build time.
export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '63qn23si'
