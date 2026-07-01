/**
 * Risk State Store – Persistent Storage for Risk State
 * 
 * Dual-write strategy:
 * - Redis: Hot state (fast reads/writes, TTL 24h)
 * - Supabase: Cold state (durability, recovery)
 * 
 * Redis client selection (fail-closed in production):
 * - If Redis REST is configured (UPSTASH_REDIS_REST_* or KV_REST_*): use real Upstash Redis
 * - Else if NODE_ENV is 'test' or 'development': use MockRedis (in-memory, safe for local dev/tests)
 * - Else (production without Redis): use FailClosedRedisClient which returns null on reads and
 *   throws on writes, causing risk state recovery to fail and trades to be blocked.
 * 
 * @module trading/risk
 * @version 3.0.2-p0
 */

import { createClient } from '@/lib/supabase/server';
import { getRedisRest, isRedisRestConfigured, type RedisLike } from '@/lib/redis-client';
import { getKvRedisAdapter } from '@/lib/redis-kv-adapter';
import { RiskState, RiskLimits, DEFAULT_RISK_LIMITS } from './risk-kernel';

// Simple Redis client wrapper used by RiskStateStore
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

/**
 * Upstash Redis (REST) adapter.
 * Converts the @upstash/redis API to the internal RedisClient interface.
 */
class UpstashRedisClient implements RedisClient {
  constructor(private readonly upstash: RedisLike) {}

  async get(key: string): Promise<string | null> {
    const value = await this.upstash.get<string>(key);
    return value ?? null;
  }

  async set(key: string, value: string, ttl: number = 86400): Promise<void> {
    await this.upstash.set(key, value, { ex: ttl });
  }

  async del(key: string): Promise<void> {
    await this.upstash.del(key);
  }
}

/**
 * In-memory Redis for development and tests.
 * NOTE: Not suitable for production - state is lost on redeploy/scale/crash.
 */
class MockRedis implements RedisClient {
  private store = new Map<string, { value: string; expiry: number }>();
  
  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }
  
  async set(key: string, value: string, ttl: number = 86400): Promise<void> {
    this.store.set(key, { value, expiry: Date.now() + ttl * 1000 });
  }
  
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Fail-closed Redis client used in production when Redis is not configured.
 * 
 * - Reads return null so that risk state recovery fails and trades are blocked.
 * - Writes throw so that state cannot be persisted without durable storage.
 * 
 * This prevents trades from executing with in-memory-only guardrails in production.
 */
class FailClosedRedisClient implements RedisClient {
  async get(key: string): Promise<string | null> {
    console.warn(`[RiskStateStore] Redis unavailable: cannot get ${key}. Trading blocked.`);
    return null;
  }
  
  async set(key: string, _value: string, _ttl?: number): Promise<void> {
    throw new Error(`Redis unavailable: cannot persist risk state for ${key}`);
  }
  
  async del(key: string): Promise<void> {
    throw new Error(`Redis unavailable: cannot delete risk state for ${key}`);
  }
}

export interface PersistedRiskState {
  userId: string;
  state: RiskState;
  limits: RiskLimits;
  version: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface StateRecoveryResult {
  state: RiskState;
  limits: RiskLimits;
  source: 'redis' | 'database' | 'default';
  recoveredAt: Date;
  version?: number;
  createdAt?: Date;
}

/**
 * Create the Redis client used for risk state.
 * 
 * Priority:
 * 1. Real Upstash Redis if env vars are configured.
 * 2. MockRedis for test/development environments.
 * 3. FailClosedRedisClient for production without Redis config.
 */
export function createRiskRedisClient(): RedisClient {
  const env = process.env.NODE_ENV;

  // I dev/test bruker vi alltid in-memory MockRedis for å unngå at ugyldige
  // eller utilgjengelige Redis-credentials blokkerer trades (f.eks. e2e).
  // I produksjon krever vi ekte Redis for fail-closed oppførsel.
  if (env === 'test' || env === 'development') {
    if (isRedisRestConfigured()) {
      console.warn(
        '[RiskStateStore] Redis er konfigurert, men ignoreres i dev/test. Bruker MockRedis.'
      );
    }
    return new MockRedis();
  }

  // Cloudflare KV is the preferred production backend because the legacy
  // Upstash endpoint is no longer resolvable. KV is still a real store with
  // TTLs, so it satisfies the fail-closed requirement.
  const kvAdapter = getKvRedisAdapter();
  if (kvAdapter) {
    return kvAdapter;
  }

  if (isRedisRestConfigured()) {
    const upstash = getRedisRest();
    if (upstash) {
      return new UpstashRedisClient(upstash);
    }
  }

  return new FailClosedRedisClient();
}

/**
 * Risk State Store – Handles persistence of risk state
 */
export class RiskStateStore {
  public readonly redis: RedisClient;
  private redisTtl = 86400; // 24 hours
  private stateVersion = 1;
  
  constructor(redis?: RedisClient) {
    this.redis = redis ?? createRiskRedisClient();
  }

  /**
   * Check whether the Redis backend is healthy.
   * Returns false if Redis is not configured or writes fail.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const testKey = `risk:health:${Date.now()}`;
      await this.redis.set(testKey, 'ok', 10);
      const value = await this.redis.get(testKey);
      return value === 'ok';
    } catch (error) {
      console.error('[RiskStateStore] Health check failed:', error);
      return false;
    }
  }
  
  /**
   * Get risk state for user
   * Tries Redis first, then database, then returns default
   */
  async getState(userId: string): Promise<StateRecoveryResult | null> {
    try {
      // 1. Try Redis (hot state)
      const redisKey = this.getRedisKey(userId);
      const redisData = await this.redis.get(redisKey);
      
      if (redisData) {
        const parsed = JSON.parse(redisData) as PersistedRiskState;
        return {
          state: this.deserializeState(parsed.state),
          limits: parsed.limits,
          source: 'redis',
          recoveredAt: new Date()
        };
      }
      
      // 2. Try database (cold state)
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('risk_state')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // Not found
          console.error('[RiskStateStore] Database error:', error);
        }
        return null;
      }
      
      if (data) {
        const persisted = (data.state as unknown) as PersistedRiskState;
        
        // Cache in Redis for next read
        await this.redis.set(redisKey, JSON.stringify(persisted), this.redisTtl);
        
        return {
          state: this.deserializeState(persisted.state),
          limits: persisted.limits || DEFAULT_RISK_LIMITS,
          source: 'database',
          recoveredAt: new Date()
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('[RiskStateStore] Failed to get state:', error);
      return null;
    }
  }
  
  /**
   * Save risk state for user
   * Dual-write to Redis and database
   */
  async saveState(
    userId: string, 
    state: RiskState, 
    limits: RiskLimits = DEFAULT_RISK_LIMITS
  ): Promise<boolean> {
    const persisted: PersistedRiskState = {
      userId,
      state,
      limits,
      version: this.stateVersion,
      updatedAt: new Date(),
      createdAt: new Date()
    };
    
    const serialized = JSON.stringify(persisted);
    
    try {
      // 1. Write to Redis (fast)
      const redisKey = this.getRedisKey(userId);
      await this.redis.set(redisKey, serialized, this.redisTtl);
      
      // 2. Write to database (durable)
      const supabase = await createClient();
      const { error } = await supabase
        .from('risk_state')
        .upsert({
          user_id: userId,
          state: persisted as never,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) {
        console.error('[RiskStateStore] Database write failed:', error);
        // Redis write succeeded, so we have partial success
        // Log for reconciliation
        await this.logReconciliationNeeded(userId, 'db_write_failed');
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('[RiskStateStore] Failed to save state:', error);
      return false;
    }
  }
  
  /**
   * Initialize new risk state for user
   */
  async initializeState(
    userId: string, 
    initialEquity: number,
    limits: RiskLimits = DEFAULT_RISK_LIMITS
  ): Promise<StateRecoveryResult> {
    const defaultState: RiskState = {
      equity: initialEquity,
      peakEquity: initialEquity,
      dailyPnl: 0,
      openPositions: 0,
      openNotional: 0,
      currentNotional: 0,
      currentLeverage: 0,
      consecutiveLosses: 0,
      tradesToday: 0,
      tradesThisHour: 0,
      volatilitySpikeActive: false,
      volatilityCooldownEnd: null,
      consecutiveLossCooldownEnd: null,
      manualBlock: false,
      lastTradeTime: null,
      currentTime: new Date()
    };
    
    await this.saveState(userId, defaultState, limits);
    
    return {
      state: defaultState,
      limits,
      source: 'default',
      recoveredAt: new Date()
    };
  }
  
  /**
   * Reset daily counters for user
   * Called by daily cron job
   */
  async resetDailyCounters(userId: string): Promise<boolean> {
    const existing = await this.getState(userId);
    
    if (!existing) {
      return false;
    }
    
    const newState: RiskState = {
      ...existing.state,
      dailyPnl: 0,
      tradesToday: 0,
      tradesThisHour: 0,
      currentTime: new Date()
    };
    
    return this.saveState(userId, newState, existing.limits);
  }
  
  /**
   * Delete state (GDPR compliance)
   */
  async deleteState(userId: string): Promise<boolean> {
    try {
      // Delete from Redis
      await this.redis.del(this.getRedisKey(userId));
      
      // Delete from database
      const supabase = await createClient();
      const { error } = await supabase
        .from('risk_state')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error('[RiskStateStore] Failed to delete state:', error);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('[RiskStateStore] Error deleting state:', error);
      return false;
    }
  }
  
  /**
   * Get all active states (for admin/monitoring)
   */
  async getAllActiveStates(): Promise<PersistedRiskState[]> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('risk_state')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[RiskStateStore] Failed to get all states:', error);
        return [];
      }
      
      return data?.map(d => (d.state as unknown) as PersistedRiskState) || [];
      
    } catch (error) {
      console.error('[RiskStateStore] Error getting all states:', error);
      return [];
    }
  }
  
  /**
   * Check if user is in cooldown
   */
  async isInCooldown(userId: string): Promise<{
    inCooldown: boolean;
    reason?: 'consecutive_losses' | 'volatility' | 'manual';
    endsAt?: Date;
  }> {
    const result = await this.getState(userId);
    
    if (!result) {
      return { inCooldown: false };
    }
    
    const state = result.state;
    const now = new Date();
    
    // Check consecutive loss cooldown
    if (state.consecutiveLossCooldownEnd && now < state.consecutiveLossCooldownEnd) {
      return {
        inCooldown: true,
        reason: 'consecutive_losses',
        endsAt: state.consecutiveLossCooldownEnd
      };
    }
    
    // Check volatility cooldown
    if (state.volatilitySpikeActive && state.volatilityCooldownEnd && now < state.volatilityCooldownEnd) {
      return {
        inCooldown: true,
        reason: 'volatility',
        endsAt: state.volatilityCooldownEnd
      };
    }
    
    // Check manual block
    if (state.manualBlock) {
      return {
        inCooldown: true,
        reason: 'manual'
      };
    }
    
    return { inCooldown: false };
  }
  
  /**
   * Update risk limits for user
   */
  async updateLimits(userId: string, newLimits: Partial<RiskLimits>): Promise<boolean> {
    const existing = await this.getState(userId);
    
    if (!existing) {
      return false;
    }
    
    const updatedLimits = { ...existing.limits, ...newLimits };
    return this.saveState(userId, existing.state, updatedLimits);
  }
  
  private getRedisKey(userId: string): string {
    return `risk:state:${userId}`;
  }
  
  private deserializeState(state: RiskState): RiskState {
    // Convert date strings back to Date objects
    return {
      ...state,
      currentTime: new Date(state.currentTime),
      lastTradeTime: state.lastTradeTime ? new Date(state.lastTradeTime) : null,
      volatilityCooldownEnd: state.volatilityCooldownEnd ? new Date(state.volatilityCooldownEnd) : null,
      consecutiveLossCooldownEnd: state.consecutiveLossCooldownEnd ? new Date(state.consecutiveLossCooldownEnd) : null
    };
  }
  
  private async logReconciliationNeeded(userId: string, reason: string): Promise<void> {
    console.warn(`[RiskStateStore] Reconciliation needed: ${userId} - ${reason}`);
    // Could write to a separate reconciliation queue/table
  }
}

/**
 * Singleton instance for application use
 */
let globalStore: RiskStateStore | null = null;

export function getRiskStateStore(redis?: RedisClient): RiskStateStore {
  if (!globalStore) {
    globalStore = new RiskStateStore(redis);
  }
  return globalStore;
}

export function resetRiskStateStore(): void {
  globalStore = null;
}
