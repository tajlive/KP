import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { sendMonitoringAlert, trackHealthCheckFailure } from '@/lib/monitoring/sentry-alerts';
import { validateCronSecret } from "@/lib/auth/cron";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JOBS = ['ai-engine', 'tick', 'feature-loader', 'ai-metrics'];
const THRESHOLD_MINUTES = 70; // e.g. ai-engine runs hourly -> 70m is lenient

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = (await createClient()) as SupabaseClient<Database>;
  const now = Date.now();

  try {
    const results = await Promise.all(
      JOBS.map(async (job) => {
        const { data, error } = await db
          .from('cron_job_runs')
          .select('status, finished_at, error_summary')
          .eq('job_name', job)
          .order('finished_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) {
          return {
            job,
            healthy: false,
            lastFinishedAt: null,
            status: 'unknown',
            reason: error ? error.message : 'No run history',
          };
        }

        const finishedAt = data.finished_at ? new Date(data.finished_at).getTime() : null;
        const minutesAgo = finishedAt ? (now - finishedAt) / 1000 / 60 : Infinity;
        const healthy = data.status === 'success' && typeof minutesAgo === 'number' && minutesAgo < THRESHOLD_MINUTES;

        return {
          job,
          healthy,
          lastFinishedAt: data.finished_at,
          status: data.status,
          minutesAgo: Math.round(minutesAgo),
          reason: data.status !== 'success' ? (data.error_summary ?? 'Job failed') : undefined,
        };
      })
    );

    // AI Decision Log Starvation Check
    const { data: latestDecision, error: decisionError } = await db
      .from('ai_decision_log')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let decisionHealthy = true;
    let decisionMinutesAgo = Infinity;

    if (!decisionError && latestDecision?.created_at) {
      decisionMinutesAgo = (now - new Date(latestDecision.created_at).getTime()) / 1000 / 60;
      // Alert if no AI decision has been logged for >3 hours 
      if (decisionMinutesAgo > 180) {
        decisionHealthy = false;
      }
    } else {
      decisionHealthy = false;
    }

    const allHealthy = results.every((r) => r.healthy);
    // AI Decision Log starvation er WARNING, ikke CRITICAL — returner 200 med advarsel
    const overallHealthy = allHealthy;

    if (!overallHealthy) {
      const failedJobs = results.filter(r => !r.healthy).map(r => `${r.job} (${r.status})`).join(', ');
      const starvationMsg = !decisionHealthy ? `(AI Decision Log starving for ${Math.round(decisionMinutesAgo)} min)` : '';
      
      sendMonitoringAlert(
        "cron_health_failure",
        `Cron Health Alert! Failed jobs: ${failedJobs || 'None'}. ${starvationMsg}`,
        "critical",
        { failedJobs, decisionMinutesAgo }
      );
    }

    return NextResponse.json(
      {
        healthy: overallHealthy,
        warning: !decisionHealthy ? 'AI Decision Log starving (ingen beslutninger siste 3t) — normalt ved lav aktivitet' : undefined,
        checkedAt: new Date().toISOString(),
        jobs: results,
        aiDecisionLog: {
          healthy: decisionHealthy,
          minutesAgo: Math.round(decisionMinutesAgo)
        }
      },
      { status: overallHealthy ? 200 : 503 }
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    trackHealthCheckFailure("cron-health-route", err);
    return NextResponse.json({ healthy: false, error: err.message }, { status: 500 });
  }
}

// Also support POST for pg_cron triggering
export const POST = GET;
