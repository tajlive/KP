/**
 * Outbox Monitor – Kill-switch for trading ved systemisk feil
 * 
 * P0 Hardening: Stram inn degraded mode
 * - Hvis outbox.failed > 0 -> blokker trades
 * - Hvis outbox.pending > threshold i mer enn tidsvindu -> blokker trades  
 * - Hvis health endpoint rapporterer 503 -> kill-switch aktivert
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface OutboxThresholds {
  maxFailed: number;
  pendingWarning: number;
  pendingCritical: number;
  pendingDurationThreshold: number;
}

export interface KillSwitchState {
  activated: boolean;
  reason: string;
  activatedAt?: Date;
  breachedThreshold?: string;
  tradesBlocked: number;
}

const DEFAULT_THRESHOLDS: OutboxThresholds = {
  maxFailed: 0,
  pendingWarning: 50,
  pendingCritical: 100,
  pendingDurationThreshold: 5 * 60 * 1000,
};

function readEnvInt(name: string, fallback: number): number {
  try {
    const value = process.env[name];
    if (value === undefined || value === '') return fallback;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  } catch {
    // Edge runtime may not expose process.env at module load; use fallback.
    return fallback;
  }
}

let pendingAboveCriticalSince: Date | null = null;
let killSwitchState: KillSwitchState = {
  activated: false,
  reason: '',
  tradesBlocked: 0
};

export function getThresholds(): OutboxThresholds {
  return {
    maxFailed: readEnvInt('OUTBOX_MAX_FAILED', DEFAULT_THRESHOLDS.maxFailed),
    pendingWarning: readEnvInt('OUTBOX_PENDING_WARNING', DEFAULT_THRESHOLDS.pendingWarning),
    pendingCritical: readEnvInt('OUTBOX_PENDING_CRITICAL', DEFAULT_THRESHOLDS.pendingCritical),
    pendingDurationThreshold: readEnvInt(
      'OUTBOX_PENDING_DURATION_MS',
      DEFAULT_THRESHOLDS.pendingDurationThreshold
    ),
  };
}

export async function checkOutboxHealth(
  supabase: SupabaseClient<Database>
): Promise<KillSwitchState> {
  const thresholds = getThresholds();
  const now = new Date();

  try {
    const { count: failedCount } = await supabase
      .from('outbox_recovery')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    const { count: pendingCount } = await supabase
      .from('outbox_recovery')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const failed = failedCount ?? 0;
    const pending = pendingCount ?? 0;

    if (failed > thresholds.maxFailed) {
      if (!killSwitchState.activated) {
        killSwitchState = {
          activated: true,
          reason: `Outbox has ${failed} failed items (max: ${thresholds.maxFailed})`,
          activatedAt: now,
          breachedThreshold: 'maxFailed',
          tradesBlocked: 0
        };
      }
      return killSwitchState;
    }

    if (pending > thresholds.pendingCritical) {
      if (!pendingAboveCriticalSince) {
        pendingAboveCriticalSince = now;
      }

      const durationOverCritical = now.getTime() - pendingAboveCriticalSince.getTime();
      
      if (durationOverCritical > thresholds.pendingDurationThreshold) {
        if (!killSwitchState.activated) {
          killSwitchState = {
            activated: true,
            reason: `Outbox pending ${pending} exceeded ${thresholds.pendingCritical} for ${Math.round(durationOverCritical / 1000)}s`,
            activatedAt: now,
            breachedThreshold: 'pendingCritical',
            tradesBlocked: 0
          };
        }
        return killSwitchState;
      }
    } else {
      pendingAboveCriticalSince = null;
    }

    return killSwitchState;

  } catch (error) {
    if (!killSwitchState.activated) {
      killSwitchState = {
        activated: true,
        reason: `Outbox health check failed: ${error instanceof Error ? error.message : String(error)}`,
        activatedAt: now,
        breachedThreshold: 'checkFailure',
        tradesBlocked: 0
      };
    }
    return killSwitchState;
  }
}

export async function isTradingAllowed(
  supabase: SupabaseClient<Database>
): Promise<{ allowed: boolean; reason?: string }> {
  const state = await checkOutboxHealth(supabase);
  
  if (state.activated) {
    killSwitchState.tradesBlocked++;
    return {
      allowed: false,
      reason: `KILL-SWITCH ACTIVE: ${state.reason} (blocked ${state.tradesBlocked} trades)`
    };
  }

  return { allowed: true };
}

export function getKillSwitchStatus(): KillSwitchState {
  return { ...killSwitchState };
}

export async function resetKillSwitch(
  supabase: SupabaseClient<Database>,
  adminUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { data: user } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', adminUserId)
    .single();

  if (!user?.role || !['admin', 'risk_manager'].includes(user.role)) {
    return { success: false, error: 'Unauthorized' };
  }

  killSwitchState = {
    activated: false,
    reason: '',
    tradesBlocked: 0
  };
  pendingAboveCriticalSince = null;

  return { success: true };
}
