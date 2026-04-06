/**
 * Outbox Recovery Cron Job
 * 
 * Kjører hvert 5. minutt for å:
 * 1. Prosessere pending items i outbox
 * 2. Synkronisere Redis→Supabase ved partial writes
 * 3. Synkronisere S3→Supabase ved audit failures
 * 4. Rapportere metrikker
 * 
 * Cron: Every 5 minutes
 */

import { createClient } from "@/lib/supabase/server";
import { OutboxRecovery } from "@/lib/trading/core/outbox-recovery";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RecoveryResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  duration: number;
  errors?: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const errors: string[] = [];
  
  try {
    const supabase = await createClient();
    const outbox = new OutboxRecovery(supabase);
    
    // Get stats before processing
    const beforeStats = await outbox.getStats();
    
    // Process all pending items
    const result = await outbox.processAll();
    
    // Get stats after processing
    const afterStats = await outbox.getStats();
    
    // Alert if there are items requiring manual intervention
    if (afterStats.requiringIntervention > 0) {
      errors.push(`${afterStats.requiringIntervention} items require manual intervention`);
      
      // Send alert to monitoring
      await sendAlert(supabase, {
        severity: 'warning',
        component: 'outbox-recovery',
        message: `${afterStats.requiringIntervention} outbox items require manual intervention`,
        details: { stats: afterStats }
      });
    }
    
    // Alert if backlog is growing
    if (afterStats.pending > beforeStats.pending && afterStats.pending > 50) {
      errors.push(`Outbox backlog growing: ${afterStats.pending} pending items`);
      
      await sendAlert(supabase, {
        severity: 'warning',
        component: 'outbox-recovery',
        message: `Outbox backlog growing: ${afterStats.pending} pending items`,
        details: { before: beforeStats, after: afterStats }
      });
    }

    const response: RecoveryResult = {
      success: true,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      remaining: result.remaining,
      duration: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined
    };

    return NextResponse.json(response);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Send critical alert
    const supabase = await createClient();
    await sendAlert(supabase, {
      severity: 'critical',
      component: 'outbox-recovery',
      message: `Outbox recovery cron failed: ${errorMessage}`,
      details: { error: errorMessage }
    });

    return NextResponse.json(
      {
        success: false,
        processed: 0,
        succeeded: 0,
        failed: 0,
        remaining: -1,
        duration: Date.now() - startTime,
        errors: [errorMessage]
      },
      { status: 500 }
    );
  }
}

async function sendAlert(
  supabase: ReturnType<typeof createClient>,
  alert: {
    severity: 'info' | 'warning' | 'critical';
    component: string;
    message: string;
    details?: unknown;
  }
): Promise<void> {
  // Store alert in database
  await supabase.from('system_alerts').insert({
    severity: alert.severity,
    component: alert.component,
    message: alert.message,
    details: alert.details as any,
    created_at: new Date().toISOString(),
    acknowledged: false
  });

  // TODO: Send to external alerting system (PagerDuty, Slack, etc.)
  console.error(`[ALERT:${alert.severity}] ${alert.component}: ${alert.message}`);
}
