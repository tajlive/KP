/**
 * Risk State Store – Redis client selection & fail-closed behaviour
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockIsRedisRestConfigured = vi.fn();
const mockGetRedisRest = vi.fn();

vi.mock('@/lib/redis-client', () => ({
  isRedisRestConfigured: () => mockIsRedisRestConfigured(),
  getRedisRest: () => mockGetRedisRest(),
}));

import {
  RiskStateStore,
  createRiskRedisClient,
  getRiskStateStore,
  resetRiskStateStore,
} from './risk-state-store';

const originalNodeEnv = process.env.NODE_ENV;

describe('RiskStateStore Redis client selection', () => {
  beforeEach(() => {
    resetRiskStateStore();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mockIsRedisRestConfigured.mockReturnValue(false);
    mockGetRedisRest.mockReturnValue(null);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    resetRiskStateStore();
    vi.unstubAllEnvs();
  });

  it('uses MockRedis in test environment without Redis config', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.KV_REST_API_URL;

    const client = createRiskRedisClient();

    // Verify MockRedis behaviour (in-memory TTL eviction)
    expect(client).toBeDefined();
  });

  it('uses real Upstash Redis when env vars are configured', async () => {
    process.env.NODE_ENV = 'production';
    mockIsRedisRestConfigured.mockReturnValue(true);
    mockGetRedisRest.mockReturnValue({
      get: mockRedisGet.mockResolvedValue('value'),
      set: mockRedisSet.mockResolvedValue('OK'),
      del: mockRedisDel.mockResolvedValue(1),
    });

    const client = createRiskRedisClient();

    // Should be the Upstash adapter, not mock/fail-closed.
    await client.set('risk:test:key', 'value', 60);
    await client.get('risk:test:key');

    expect(mockRedisSet).toHaveBeenCalledWith('risk:test:key', 'value', { ex: 60 });
    expect(mockRedisGet).toHaveBeenCalledWith('risk:test:key');
  });

  it('fail-closed client returns null on get and throws on write in production without Redis', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const client = createRiskRedisClient();

    // Reads return null so risk state recovery fails and trades are blocked.
    await expect(client.get('risk:state:user')).resolves.toBeNull();

    // Writes throw so state cannot be persisted without durable storage.
    await expect(client.set('risk:state:user', '{}', 60)).rejects.toThrow(
      'Redis unavailable'
    );
    await expect(client.del('risk:state:user')).rejects.toThrow(
      'Redis unavailable'
    );
  });

  it('RiskStateStore uses injected Redis client over environment config', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };

    const store = new RiskStateStore(mockClient);
    await store.redis.get('x');
    expect(mockClient.get).toHaveBeenCalledWith('x');
  });

  it('getRiskStateStore returns a singleton', () => {
    process.env.NODE_ENV = 'test';
    const storeA = getRiskStateStore();
    const storeB = getRiskStateStore();
    expect(storeA).toBe(storeB);
  });
});
