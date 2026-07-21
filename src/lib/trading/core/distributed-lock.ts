/**
 * Distributed Lock – Prevents concurrent trade execution
 * 
 * Uses Redis-based locking with automatic expiration to prevent:
 * - Double-trade scenarios (same user, same symbol)
 * - Race conditions in session modification
 * - Duplicate order submissions
 * 
 * @module trading/core
 * @version 1.0.0
 */

import { getRiskStateStore } from '@/lib/trading/risk/risk-state-store';
import { getKvRedisAdapter } from '@/lib/redis-kv-adapter';

export interface LockResult {
  acquired: boolean;
  lockId?: string;
  expiresAt?: Date;
  error?: string;
}

export interface LockOptions {
  /** Lock TTL in seconds (default: 30) */
  ttlSeconds?: number;
  /** Retry attempts if lock is busy (default: 0) */
  retries?: number;
  /** Delay between retries in ms (default: 100) */
  retryDelayMs?: number;
}

const DEFAULT_OPTIONS: LockOptions = {
  ttlSeconds: 30,
  retries: 0,
  retryDelayMs: 100,
};

/**
 * Generate lock key for trade operations
 * Format: trade:lock:{userId}:{symbol}:{operation}
 */
export function generateTradeLockKey(
  userId: string,
  symbol: string,
  operation: 'execute' | 'close' | 'modify' = 'execute'
): string {
  // Normalize symbol (uppercase, no slashes)
  const normalizedSymbol = symbol.toUpperCase().replace(/[/\-]/g, '');
  return `trade:lock:${userId}:${normalizedSymbol}:${operation}`;
}

/**
 * Generate lock key for session operations
 * Format: session:lock:{userId}:{sessionId}
 */
export function generateSessionLockKey(
  userId: string,
  sessionId: string
): string {
  return `session:lock:${userId}:${sessionId}`;
}

/**
 * Acquire a distributed lock
 * 
 * @param key - The lock key
 * @param lockId - Unique identifier for this lock holder
 * @param options - Lock options
 * @returns LockResult indicating success/failure
 */
export async function acquireLock(
  key: string,
  lockId: string,
  options: LockOptions = {}
): Promise<LockResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  // Try KV first (production), then fall back to the risk-store Redis client.
  const redis = getKvRedisAdapter() ?? (getRiskStateStore().redis as {
    set(key: string, value: string, ttl?: number): Promise<void>;
    get(key: string): Promise<string | null>;
  });
  
  if (!redis) {
    throw new Error(
      'TRADE_LOCK_UNAVAILABLE: Redis client not available for distributed locking. ' +
      'Trade execution blocked to prevent race conditions.'
    );
  }
  
  const maxAttempts = opts.retries! + 1;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Try to acquire lock using NX (only if not exists) + EX (expiration)
      // We implement this as: check if exists, if not, set with TTL
      const existing = await redis.get(key);
      
      if (!existing) {
        // Lock is free - acquire it
        const expiresAt = new Date(Date.now() + opts.ttlSeconds! * 1000);
        const lockValue = JSON.stringify({
          lockId,
          acquiredAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        });
        
        await redis.set(key, lockValue, opts.ttlSeconds);
        
        return {
          acquired: true,
          lockId,
          expiresAt,
        };
      }
      
      // Lock is held by someone else
      console.error(`[DEBUG-LOCK] busy key=${key} existing=${existing}`);
      if (attempt < maxAttempts - 1) {
        await sleep(opts.retryDelayMs!);
      }
    } catch (error) {
      return {
        acquired: false,
        error: `Lock acquisition failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  return {
    acquired: false,
    error: `Lock is busy: ${key}`,
  };
}

/**
 * Release a distributed lock
 * 
 * @param key - The lock key
 * @param lockId - The lock ID to verify ownership
 * @returns true if lock was released, false otherwise
 */
export async function releaseLock(
  key: string,
  lockId: string
): Promise<boolean> {
  const redis = getKvRedisAdapter() ?? (getRiskStateStore().redis as {
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
  });
  
  if (!redis) {
    console.warn('[DistributedLock] Redis not available for lock release');
    return false;
  }
  
  try {
    const existing = await redis.get(key);
    
    if (!existing) {
      // Lock already expired or was released
      return true;
    }
    
    const lockData = JSON.parse(existing);
    
    if (lockData.lockId !== lockId) {
      // Lock is held by someone else - don't release
      console.warn(`[DistributedLock] Cannot release lock ${key}: owned by ${lockData.lockId}, not ${lockId}`);
      return false;
    }
    
    // Release the lock
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`[DistributedLock] Failed to release lock ${key}:`, error);
    return false;
  }
}

/**
 * Extend an existing lock's TTL
 * 
 * @param key - The lock key
 * @param lockId - The lock ID to verify ownership
 * @param additionalSeconds - Seconds to add to TTL
 * @returns true if lock was extended, false otherwise
 */
export async function extendLock(
  key: string,
  lockId: string,
  additionalSeconds: number
): Promise<boolean> {
  const redis = getKvRedisAdapter() ?? (getRiskStateStore().redis as {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
  });
  
  if (!redis) {
    return false;
  }
  
  try {
    const existing = await redis.get(key);
    
    if (!existing) {
      return false;
    }
    
    const lockData = JSON.parse(existing);
    
    if (lockData.lockId !== lockId) {
      return false;
    }
    
    // Update expiry
    const newExpiresAt = new Date(Date.now() + additionalSeconds * 1000);
    const updatedValue = JSON.stringify({
      ...lockData,
      expiresAt: newExpiresAt.toISOString(),
      extendedAt: new Date().toISOString(),
    });
    
    await redis.set(key, updatedValue, additionalSeconds);
    return true;
  } catch (error) {
    console.error(`[DistributedLock] Failed to extend lock ${key}:`, error);
    return false;
  }
}

/**
 * Execute a function with automatic lock acquisition and release
 * 
 * @param key - The lock key
 * @param fn - Function to execute while holding the lock
 * @param options - Lock options
 * @returns Result of the function or error
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<{ success: true; result: T } | { success: false; error: string }> {
  const lockId = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  
  const lockResult = await acquireLock(key, lockId, options);
  
  if (!lockResult.acquired) {
    return {
      success: false,
      error: lockResult.error || 'Failed to acquire lock',
    };
  }
  
  try {
    const result = await fn();
    return { success: true, result };
  } finally {
    // Always release lock, even if fn throws
    await releaseLock(key, lockId);
  }
}

/**
 * Check if a lock is currently held
 * 
 * @param key - The lock key
 * @returns Lock info or null if not held
 */
export async function getLockInfo(
  key: string
): Promise<{ lockId: string; acquiredAt: Date; expiresAt: Date } | null> {
  const redis = getKvRedisAdapter() ?? (getRiskStateStore().redis as {
    get(key: string): Promise<string | null>;
  });
  
  if (!redis) {
    return null;
  }
  
  try {
    const existing = await redis.get(key);
    
    if (!existing) {
      return null;
    }
    
    const lockData = JSON.parse(existing);
    return {
      lockId: lockData.lockId,
      acquiredAt: new Date(lockData.acquiredAt),
      expiresAt: new Date(lockData.expiresAt),
    };
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * High-level trade execution lock
 * Acquires a lock for a specific user+symbol combination
 */
export async function acquireTradeLock(
  userId: string,
  symbol: string,
  options?: LockOptions
): Promise<LockResult & { release: () => Promise<boolean> }> {
  const lockId = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const key = generateTradeLockKey(userId, symbol);
  
  const result = await acquireLock(key, lockId, {
    ttlSeconds: 30, // 30 seconds should be enough for trade execution
    ...options,
  });
  
  return {
    ...result,
    release: () => releaseLock(key, lockId),
  };
}
