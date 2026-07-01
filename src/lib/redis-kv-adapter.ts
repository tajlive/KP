import { getCloudflareContext } from "@opennextjs/cloudflare";

// Minimal RedisClient interface used by risk store and distributed lock.
// Keep it intentionally small so KV can sit behind it without friction.
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

interface KVNamespaceBinding {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

const KV_MIN_TTL_SECONDS = 60;

/**
 * Cloudflare KV-backed RedisClient.
 *
 * Cloudflare KV requires expirationTtl >= 60. All set() TTLs are clamped to
 * at least 60 seconds so that short-lived locks/probes (10s, 30s, 35s) work.
 */
export class KvRedisAdapter implements RedisClient {
  constructor(private readonly binding: KVNamespaceBinding) {}

  async get(key: string): Promise<string | null> {
    return this.binding.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expirationTtl = ttlSeconds !== undefined ? Math.max(ttlSeconds, KV_MIN_TTL_SECONDS) : undefined;
    await this.binding.put(key, value, expirationTtl ? { expirationTtl } : undefined);
  }

  async del(key: string): Promise<void> {
    await this.binding.delete(key);
  }
}

function tryGetSyncBinding(): KVNamespaceBinding | null {
  try {
    const env = getCloudflareContext().env as Record<string, unknown>;
    const binding = env.KV_KLARPAKKE;
    if (
      binding &&
      typeof binding === "object" &&
      binding !== null &&
      "get" in binding &&
      "put" in binding &&
      "delete" in binding
    ) {
      return binding as KVNamespaceBinding;
    }
  } catch {
    // sync context not available
  }
  return null;
}

async function tryGetAsyncBinding(): Promise<KVNamespaceBinding | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as Record<string, unknown>;
    const binding = env.KV_KLARPAKKE;
    if (
      binding &&
      typeof binding === "object" &&
      binding !== null &&
      "get" in binding &&
      "put" in binding &&
      "delete" in binding
    ) {
      return binding as KVNamespaceBinding;
    }
  } catch {
    // async context not available
  }
  return null;
}

let cachedSyncAdapter: RedisClient | null | undefined = undefined;

export function getKvRedisAdapter(): RedisClient | null {
  if (cachedSyncAdapter !== undefined) return cachedSyncAdapter;
  const binding = tryGetSyncBinding();
  cachedSyncAdapter = binding ? new KvRedisAdapter(binding) : null;
  return cachedSyncAdapter;
}

let cachedAsyncAdapter: RedisClient | null | undefined = undefined;

export async function getKvRedisAdapterAsync(): Promise<RedisClient | null> {
  if (cachedAsyncAdapter !== undefined) return cachedAsyncAdapter;
  const binding = await tryGetAsyncBinding();
  cachedAsyncAdapter = binding ? new KvRedisAdapter(binding) : null;
  return cachedAsyncAdapter;
}
