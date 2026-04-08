import { createClient } from 'next-sanity';

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-04-07';

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Bruk CDN for raskere lesing
  perspective: 'published', // Kun publisert innhold
});

// Preview klient for draft-innhold
export const previewClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
});

export const getClient = (preview = false) => (preview ? previewClient : client);
