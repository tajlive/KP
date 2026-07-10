import { createClient } from "next-sanity";
import { draftMode } from "next/headers";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "63qn23si";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-04-07";

// Validate environment variables
if (!projectId) {
  console.warn(
    "⚠️ NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Sanity CMS will not work.",
  );
}

// Production client — CDN off for ISR/tag-revalidation consistency.
// Sanity CDN caches ~60s which can clash with Next.js revalidate cycles.
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: "published",
  stega: { enabled: false },
});

// Sitemap client — uses CDN to avoid burning API quota during builds.
// Sitemap data does not need ISR consistency, so CDN caching is fine.
export const sitemapClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
  stega: { enabled: false },
});

// Preview client (for draft content) — always bypass CDN
export const previewClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
  perspective: "previewDrafts",
  stega: { enabled: false },
});

/**
 * Get the correct client based on draft mode.
 * Must be called from an async server context.
 */
export async function getSanityClient() {
  const isDraft = await draftMode()
    .then((d) => d.isEnabled)
    .catch(() => false);
  return isDraft ? previewClient : client;
}

// Helper to check if Sanity is configured
export const isSanityConfigured = () => {
  return !!projectId;
};

// Safe fetch helper that falls back gracefully
export async function safeFetch<T>(
  query: string,
  params: { [key: string]: unknown } = {},
  fallback: T,
  options?: {
    next?: { revalidate?: number | false; tags?: string[] };
  },
): Promise<T> {
  try {
    if (!isSanityConfigured()) {
      console.warn("Sanity not configured, using fallback data");
      return fallback;
    }
    const sanityClient = await getSanityClient();
    const result = await sanityClient.fetch<T>(query, params, options);
    return result ?? fallback;
  } catch {
    // Silently fall back — avoid noisy logs when Sanity is over quota
    return fallback;
  }
}
