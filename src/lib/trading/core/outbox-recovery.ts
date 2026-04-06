/**
 * Outbox Recovery Service
 * 
 * Håndterer partial write failures:
 * - Redis ok / Supabase fail -> Redis-to-DB sync
 * - S3 ok / Supabase fail -> S3-to-DB sync
 * - DB ok / S3 fail -> DB-to-S3 sync
 * 
 * Kjøres som cron job hvert 5. minutt.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getRiskStateStore } from "@/lib/trading/risk/risk-state-store";
import { getAuditStore } from "@/lib/trading/execution/audit-store";

interface OutboxItem {
  id: string;
  type: 'RISK_STATE_SYNC' | 'AUDIT_S3_SYNC' | 'AUDIT_DB_SYNC';
  payload: any;
  attempts: number;
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
}

export class OutboxRecovery {
  private supabase: SupabaseClient<Database>;
  private maxAttempts = 5;
  private retryDelays = [30, 60, 120, 300, 600]; // seconds

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Legg til item i outbox for retry
   */
  async enqueue(item: Omit<OutboxItem, 'id' | 'attempts' | 'createdAt'>): Promise<void> {
    const { error } = await this.supabase
      .from('outbox_recovery')
      .insert({
        type: item.type,
        payload: item.payload,
        attempts: 0,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[OutboxRecovery] Failed to enqueue:', error);
      throw new Error(`Outbox enqueue failed: ${error.message}`);
    }
  }

  /**
   * Hent pending items som skal retry nå
   */
  async getPendingItems(limit: number = 100): Promise<OutboxItem[]> {
    const { data, error } = await this.supabase
      .from('outbox_recovery')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', this.maxAttempts)
      .or(`last_attempt.is.null,and(last_attempt.lt.${new Date(Date.now() - 30000).toISOString()})`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[OutboxRecovery] Failed to fetch pending:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      type: item.type,
      payload: item.payload,
      attempts: item.attempts,
      createdAt: new Date(item.created_at),
      lastAttempt: item.last_attempt ? new Date(item.last_attempt) : undefined,
      error: item.error
    }));
  }

  /**
   * Prosesser alle pending items
   */
  async processAll(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    remaining: number;
  }> {
    const items = await this.getPendingItems();
    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      const result = await this.processItem(item);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    // Tell gjenværende pending items
    const { count } = await this.supabase
      .from('outbox_recovery')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return {
      processed: items.length,
      succeeded,
      failed,
      remaining: count || 0
    };
  }

  /**
   * Prosesser én item
   */
  private async processItem(item: OutboxItem): Promise<{ success: boolean; error?: string }> {
    console.log(`[OutboxRecovery] Processing ${item.type} (attempt ${item.attempts + 1}/${this.maxAttempts})`);

    try {
      switch (item.type) {
        case 'RISK_STATE_SYNC':
          return await this.syncRiskState(item);
        case 'AUDIT_S3_SYNC':
          return await this.syncAuditToS3(item);
        case 'AUDIT_DB_SYNC':
          return await this.syncAuditToDb(item);
        default:
          return { success: false, error: `Unknown type: ${item.type}` };
      }
    } catch (error) {
      await this.markFailed(item, error instanceof Error ? error.message : String(error));
      return { success: false, error: String(error) };
    }
  }

  /**
   * Sync risk state fra Redis til Supabase
   */
  private async syncRiskState(item: OutboxItem): Promise<{ success: boolean; error?: string }> {
    const { userId } = item.payload;
    const store = getRiskStateStore();

    // Hent fra Redis
    const state = await store.getState(userId);
    if (!state) {
      return { success: false, error: 'State not found in Redis' };
    }

    // Skriv til Supabase
    const { error } = await this.supabase
      .from('risk_state')
      .upsert({
        user_id: userId,
        state: {
          userId,
          state: state.state,
          limits: state.limits,
          version: state.version,
          updatedAt: new Date(),
          createdAt: state.createdAt
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      await this.scheduleRetry(item, error.message);
      return { success: false, error: error.message };
    }

    // Success - marker som done
    await this.markCompleted(item);
    return { success: true };
  }

  /**
   * Sync audit fra DB til S3
   */
  private async syncAuditToS3(item: OutboxItem): Promise<{ success: boolean; error?: string }> {
    const { evidenceId, evidence } = item.payload;
    const auditStore = getAuditStore();

    const result = await auditStore.syncToS3(evidenceId, evidence);
    
    if (!result.success) {
      await this.scheduleRetry(item, result.error || 'S3 sync failed');
      return { success: false, error: result.error };
    }

    await this.markCompleted(item);
    return { success: true };
  }

  /**
   * Sync audit fra S3 til DB (backup recovery)
   */
  private async syncAuditToDb(item: OutboxItem): Promise<{ success: boolean; error?: string }> {
    // Recovery scenario: S3 har data som mangler i DB
    const { evidenceId } = item.payload;
    const auditStore = getAuditStore();

    const result = await auditStore.syncFromS3ToDb(evidenceId);
    
    if (!result.success) {
      await this.scheduleRetry(item, result.error || 'DB sync failed');
      return { success: false, error: result.error };
    }

    await this.markCompleted(item);
    return { success: true };
  }

  /**
   * Marker item som fullført
   */
  private async markCompleted(item: OutboxItem): Promise<void> {
    await this.supabase
      .from('outbox_recovery')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', item.id);
  }

  /**
   * Planlegg retry med exponential backoff
   */
  private async scheduleRetry(item: OutboxItem, error: string): Promise<void> {
    const delay = this.retryDelays[Math.min(item.attempts, this.retryDelays.length - 1)];
    const nextAttempt = new Date(Date.now() + delay * 1000);

    await this.supabase
      .from('outbox_recovery')
      .update({
        attempts: item.attempts + 1,
        last_attempt: new Date().toISOString(),
        next_attempt: nextAttempt.toISOString(),
        error
      })
      .eq('id', item.id);
  }

  /**
   * Marker som permanent feilet (etter max attempts)
   */
  private async markFailed(item: OutboxItem, error: string): Promise<void> {
    await this.supabase
      .from('outbox_recovery')
      .update({
        status: 'failed',
        attempts: item.attempts + 1,
        last_attempt: new Date().toISOString(),
        error,
        requires_manual_intervention: true
      })
      .eq('id', item.id);

    // Alert for manual intervention
    console.error(`[OutboxRecovery] PERMANENT FAILURE: ${item.type} - requires manual intervention`);
    
    // TODO: Send alert (PagerDuty, Slack, etc.)
  }

  /**
   * Hent statistikk for monitoring
   */
  async getStats(): Promise<{
    pending: number;
    completed: number;
    failed: number;
    requiringIntervention: number;
    oldestPending?: Date;
  }> {
    const [{ data: pending }, { data: completed }, { data: failed }] = await Promise.all([
      this.supabase.from('outbox_recovery').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      this.supabase.from('outbox_recovery').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      this.supabase.from('outbox_recovery').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    ]);

    const { data: oldest } = await this.supabase
      .from('outbox_recovery')
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const { data: intervention } = await this.supabase
      .from('outbox_recovery')
      .select('*', { count: 'exact', head: true })
      .eq('requires_manual_intervention', true);

    return {
      pending: pending || 0,
      completed: completed || 0,
      failed: failed || 0,
      requiringIntervention: intervention || 0,
      oldestPending: oldest ? new Date(oldest.created_at) : undefined
    };
  }
}
