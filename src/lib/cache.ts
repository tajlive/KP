import { getRedisRest, isRedisRestConfigured } from "@/lib/redis-client";

/**
 * Cache Provider Interface
 */
interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * In-memory cache for development or when Redis is not available
 */
class MemoryCache implements CacheProvider {
  private cache: Map<string, { data: unknown; expires: number }> = new Map();
  private readonly DEFAULT_TTL = 60 * 1000;

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  async set<T>(
    key: string,
    data: T,
    ttlMs: number = this.DEFAULT_TTL,
  ): Promise<void> {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

/**
 * Upstash Redis (REST) for global production caching
 */
class UpstashRedisCache implements CacheProvider {
  private readonly DEFAULT_TTL_SEC = 60;

  async get<T>(key: string): Promise<T | null> {
    const redis = getRedisRest();
    if (!redis) return null;
    try {
      return await redis.get<T>(key);
    } catch (error) {
      console.error("Redis cache get error:", error);
      return null;
    }
  }

  async set<T>(
    key: string,
    data: T,
    ttlMs: number = this.DEFAULT_TTL_SEC * 1000,
  ): Promise<void> {
    const redis = getRedisRest();
    if (!redis) return;
    try {
      await redis.set(key, data, {
        ex: Math.ceil(ttlMs / 1000),
      });
    } catch (error) {
      console.error("Redis cache set error:", error);
    }
  }

  async delete(key: string): Promise<void> {
    const redis = getRedisRest();
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (error) {
      console.error("Redis cache delete error:", error);
    }
  }

  async clear(): Promise<void> {
    const redis = getRedisRest();
    if (!redis) return;
    try {
      await redis.flushall();
    } catch (error) {
      console.error("Redis cache clear error:", error);
    }
  }
}

export const cache: CacheProvider = isRedisRestConfigured()
  ? new UpstashRedisCache()
  : new MemoryCache();

// Predefined cache TTLs (in milliseconds)
export const CACHE_TTL = {
  MARKET_DATA: 10 * 1000, // 10 seconds for live prices
  LEADERBOARD: 60 * 1000, // 1 minute for leaderboard
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes for user data
  COURSES: 60 * 60 * 1000, // 1 hour for course content
  STATIC_DATA: 24 * 60 * 60 * 1000, // 24 hours for static content
} as const;

/**
 * Helper for cached async functions
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL.MARKET_DATA,
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetchFn();
  await cache.set(key, data, ttl);
  return data;
}

/**
 * Cache keys generator
 */
export const cacheKeys = {
  marketData: (symbol: string) => `market:${symbol}`,
  leaderboard: (period: string) => `leaderboard:${period}`,
  userProfile: (userId: string) => `user:${userId}`,
  portfolio: (userId: string) => `portfolio:${userId}`,
  trades: (userId: string, limit: number) => `trades:${userId}:${limit}`,
  course: (courseId: string) => `course:${courseId}`,
} as const;
