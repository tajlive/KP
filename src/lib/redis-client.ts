import { Redis as UpstashRedis } from "@upstash/redis";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Minimal Redis-like interface used by Klarpakke.
 *
 * Implemented by both Upstash Redis REST and Cloudflare Workers KV.
 * Keeping the surface small lets us swap the backend without touching callers.
 */
export interface RedisLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  flushall?(): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  pexpire(key: string, milliseconds: number): Promise<unknown>;
  pipeline(): RedisPipeline;
}

export interface RedisPipeline {
  incr(key: string): RedisPipeline;
  expire(key: string, seconds: number): RedisPipeline;
  pexpire(key: string, milliseconds: number): RedisPipeline;
  exec<T>(): Promise<T>;
}

/**
 * Cloudflare KV adapter that exposes a subset of the Redis API.
 *
 * Why: The legacy Upstash Redis database referenced by KV_REST_API_URL is no
 * longer resolvable. Cloudflare Workers KV namespaces already exist in the
 * account, so we use KV as the primary cache store in production and keep
 * Upstash Redis as a fallback when KV is not bound.
 */
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

function deserialize<T>(raw: string | null): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Legacy/plain-text values
    return raw as unknown as T;
  }
}

class CloudflareKvPipeline implements RedisPipeline {
  private commands: Array<() => Promise<unknown>> = [];

  constructor(private readonly kv: KVNamespace) {}

  incr(key: string): RedisPipeline {
    this.commands.push(async () => {
      const current = deserialize<number>(await this.kv.get(key)) ?? 0;
      const next = current + 1;
      await this.kv.put(key, serialize(next));
      return next;
    });
    return this;
  }

  expire(key: string, seconds: number): RedisPipeline {
    this.commands.push(async () => {
      const raw = await this.kv.get(key);
      if (raw === null) return 0;
      await this.kv.put(key, raw, { expirationTtl: seconds });
      return 1;
    });
    return this;
  }

  pexpire(key: string, milliseconds: number): RedisPipeline {
    return this.expire(key, Math.ceil(milliseconds / 1000));
  }

  async exec<T>(): Promise<T> {
    const results = await Promise.all(this.commands.map((cmd) => cmd()));
    return results as T;
  }
}

class CloudflareKvRedis implements RedisLike {
  constructor(private readonly kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    return deserialize<T>(await this.kv.get(key));
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<string> {
    await this.kv.put(key, serialize(value), {
      expirationTtl: opts?.ex,
    });
    return "OK";
  }

  async del(key: string): Promise<number> {
    await this.kv.delete(key);
    return 1;
  }

  async flushall(): Promise<string> {
    // Cloudflare KV does not support scanning/deleting all keys.
    // Callers should rely on TTLs; this is a no-op.
    return "OK";
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next);
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const raw = await this.kv.get(key);
    if (raw === null) return 0;
    await this.kv.put(key, raw, { expirationTtl: seconds });
    return 1;
  }

  async pexpire(key: string, milliseconds: number): Promise<number> {
    return this.expire(key, Math.ceil(milliseconds / 1000));
  }

  pipeline(): RedisPipeline {
    return new CloudflareKvPipeline(this.kv);
  }
}

class UpstashRedisWrapper implements RedisLike {
  constructor(private readonly redis: UpstashRedis) {}

  get<T>(key: string): Promise<T | null> {
    return this.redis.get<T>(key);
  }

  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown> {
    return opts?.ex !== undefined
      ? this.redis.set(key, value, { ex: opts.ex })
      : this.redis.set(key, value);
  }

  del(key: string): Promise<unknown> {
    return this.redis.del(key);
  }

  flushall(): Promise<unknown> {
    return this.redis.flushall();
  }

  incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  expire(key: string, seconds: number): Promise<unknown> {
    return this.redis.expire(key, seconds);
  }

  pexpire(key: string, milliseconds: number): Promise<unknown> {
    return this.redis.pexpire(key, milliseconds);
  }

  pipeline(): RedisPipeline {
    const upstashPipeline = this.redis.pipeline();
    return {
      incr(key: string) {
        upstashPipeline.incr(key);
        return this;
      },
      expire(key: string, seconds: number) {
        upstashPipeline.expire(key, seconds);
        return this;
      },
      pexpire(key: string, milliseconds: number) {
        upstashPipeline.pexpire(key, milliseconds);
        return this;
      },
      async exec<T>(): Promise<T> {
        return (await upstashPipeline.exec()) as T;
      },
    };
  }
}

function getCloudflareKvBinding(): KVNamespace | null {
  // In Cloudflare Workers bindings are not strings and are therefore not
  // copied to process.env by OpenNext. They live on the Cloudflare context.
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
      return binding as KVNamespace;
    }
  } catch {
    // Outside a request context (e.g. SSG) — no KV available
  }
  return null;
}

/**
 * Upstash Redis via REST (erstatter deprecated @vercel/kv).
 * Støtter både nye Upstash-variabler og legacy Vercel KV (KV_REST_*).
 */
const upstashUrl =
  process.env.UPSTASH_REDIS_REST_URL?.trim() ||
  process.env.KV_REST_API_URL?.trim()?.replace(/^"|"$/g, "");
const upstashToken =
  process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
  process.env.KV_REST_API_TOKEN?.trim()?.replace(/^"|"$/g, "");

export function isRedisRestConfigured(): boolean {
  if (getCloudflareKvBinding()) return true;
  return Boolean(upstashUrl && upstashToken);
}

let singleton: RedisLike | null = null;

export function getRedisRest(): RedisLike | null {
  if (singleton) return singleton;

  const kvBinding = getCloudflareKvBinding();
  if (kvBinding) {
    singleton = new CloudflareKvRedis(kvBinding);
    return singleton;
  }

  if (upstashUrl && upstashToken) {
    singleton = new UpstashRedisWrapper(new UpstashRedis({ url: upstashUrl, token: upstashToken }));
    return singleton;
  }

  return null;
}
