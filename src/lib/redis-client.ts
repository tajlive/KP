import { Redis } from "@upstash/redis";

/**
 * Upstash Redis via REST (erstatter deprecated @vercel/kv).
 * Støtter både nye Upstash-variabler og legacy Vercel KV (KV_REST_*).
 */
const url =
  process.env.UPSTASH_REDIS_REST_URL?.trim() ||
  process.env.KV_REST_API_URL?.trim();
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
  process.env.KV_REST_API_TOKEN?.trim();

export function isRedisRestConfigured(): boolean {
  return Boolean(url && token);
}

let singleton: Redis | null = null;

export function getRedisRest(): Redis | null {
  if (!isRedisRestConfigured()) return null;
  if (!singleton) {
    singleton = new Redis({ url: url!, token: token! });
  }
  return singleton;
}
