/**
 * Trustpilot API client
 * Fetches reviews from Trustpilot API or falls back to mock data
 */

import { cache, CACHE_TTL, withCache } from "@/lib/cache";
import {
  mockReviews,
  mockSummary,
  TrustpilotReview,
  TrustpilotSummary,
  isMockData,
} from "./mock-reviews";

const CACHE_KEY_REVIEWS = "trustpilot:reviews";
const CACHE_KEY_SUMMARY = "trustpilot:summary";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface TrustpilotApiConfig {
  apiKey: string;
  apiSecret: string;
  businessUnitId: string;
}

function getConfig(): TrustpilotApiConfig | null {
  const apiKey = process.env.TRUSTPILOT_API_KEY;
  const apiSecret = process.env.TRUSTPILOT_API_SECRET;
  const businessUnitId = process.env.TRUSTPILOT_BUSINESS_UNIT_ID;

  if (!apiKey || !apiSecret || !businessUnitId) {
    return null;
  }

  return { apiKey, apiSecret, businessUnitId };
}

/**
 * Fetch reviews from Trustpilot API
 * Falls back to mock data if no API key is configured
 */
export async function getReviews(
  limit: number = 10,
): Promise<TrustpilotReview[]> {
  // Return mock data if no API key
  if (isMockData()) {
    return mockReviews.slice(0, limit);
  }

  // Try cache first
  const cached = await cache.get<TrustpilotReview[]>(CACHE_KEY_REVIEWS);
  if (cached) {
    return cached.slice(0, limit);
  }

  const config = getConfig();
  if (!config) {
    return mockReviews.slice(0, limit);
  }

  try {
    const response = await fetch(
      `https://api.trustpilot.com/v1/business-units/${config.businessUnitId}/reviews?apikey=${config.apiKey}&perPage=${limit}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 3600 }, // 1 hour
      },
    );

    if (!response.ok) {
      console.warn("Trustpilot API error, falling back to mock data:", response.status);
      return mockReviews.slice(0, limit);
    }

    const data = await response.json();
    
    const reviews: TrustpilotReview[] = data.reviews.map((review: unknown) => {
      const r = review as {
        id: string;
        stars: number;
        title: string;
        text: string;
        consumer: { displayName: string };
        createdAt: string;
      };
      return {
        id: r.id,
        stars: r.stars,
        title: r.title,
        text: r.text,
        author: r.consumer.displayName,
        date: r.createdAt,
        verified: true,
      };
    });

    // Cache the results
    await cache.set(CACHE_KEY_REVIEWS, reviews, CACHE_TTL_MS);

    return reviews.slice(0, limit);
  } catch (error) {
    console.warn("Trustpilot API error, falling back to mock data:", error);
    return mockReviews.slice(0, limit);
  }
}

/**
 * Get summary statistics from Trustpilot
 * Falls back to mock data if no API key is configured
 */
export async function getSummary(): Promise<TrustpilotSummary> {
  // Return mock data if no API key
  if (isMockData()) {
    return mockSummary;
  }

  // Try cache first
  const cached = await cache.get<TrustpilotSummary>(CACHE_KEY_SUMMARY);
  if (cached) {
    return cached;
  }

  const config = getConfig();
  if (!config) {
    return mockSummary;
  }

  try {
    const response = await fetch(
      `https://api.trustpilot.com/v1/business-units/${config.businessUnitId}?apikey=${config.apiKey}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 3600 }, // 1 hour
      },
    );

    if (!response.ok) {
      console.warn("Trustpilot API error, falling back to mock data:", response.status);
      return mockSummary;
    }

    const data = await response.json();

    const summary: TrustpilotSummary = {
      stars: data.score?.stars || 4.8,
      count: data.numberOfReviews?.total || 1247,
      trustScore: data.score?.trustScore || 4.8,
    };

    // Cache the results
    await cache.set(CACHE_KEY_SUMMARY, summary, CACHE_TTL_MS);

    return summary;
  } catch (error) {
    console.warn("Trustpilot API error, falling back to mock data:", error);
    return mockSummary;
  }
}

/**
 * Get reviews with caching wrapper
 */
export async function getReviewsWithCache(
  limit: number = 10,
): Promise<TrustpilotReview[]> {
  return withCache(
    `${CACHE_KEY_REVIEWS}:${limit}`,
    () => getReviews(limit),
    CACHE_TTL.STATIC_DATA,
  );
}

/**
 * Get summary with caching wrapper
 */
export async function getSummaryWithCache(): Promise<TrustpilotSummary> {
  return withCache(
    CACHE_KEY_SUMMARY,
    getSummary,
    CACHE_TTL.STATIC_DATA,
  );
}
