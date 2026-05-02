import { createClient } from 'next-sanity';
import { draftMode } from 'next/headers';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '63qn23si';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-04-07';

// Validate environment variables
if (!projectId) {
  console.warn('⚠️ NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Sanity CMS will not work.');
}

// Production client (uses CDN for fast reads)
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
});

// Preview client (for draft content)
export const previewClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
});

/**
 * Get the correct client based on draft mode.
 * Must be called from an async server context.
 */
export async function getSanityClient() {
  const isDraft = await draftMode().then(d => d.isEnabled).catch(() => false);
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
  options?: { next?: { revalidate?: number | false; tags?: string[] } }
): Promise<T> {
  try {
    if (!isSanityConfigured()) {
      console.warn('Sanity not configured, using fallback data');
      return fallback;
    }
    const sanityClient = await getSanityClient();
    const result = await sanityClient.fetch<T>(query, params, options);
    return result ?? fallback;
  } catch (error) {
    console.error('Sanity fetch error:', error);
    return fallback;
  }
}
