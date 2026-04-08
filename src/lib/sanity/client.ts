import { createClient } from 'next-sanity';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
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

// Helper to get the right client
export const getClient = (preview = false) => 
  preview ? previewClient : client;

// Helper to check if Sanity is configured
export const isSanityConfigured = () => {
  return !!projectId;
};

// Safe fetch helper that falls back gracefully
export async function safeFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  fallback: T
): Promise<T> {
  try {
    if (!isSanityConfigured()) {
      console.warn('Sanity not configured, using fallback data');
      return fallback;
    }
    return await client.fetch<T>(query, params);
  } catch (error) {
    console.error('Sanity fetch error:', error);
    return fallback;
  }
}
