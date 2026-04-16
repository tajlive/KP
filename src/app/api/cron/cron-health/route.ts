import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JOBS = ['ai-engine', 'tick', 'feature-loader', 'ai-metrics'];
const THRESHOLD_MINUTES = 70; // e.g. ai-engine runs hourly -> 70m is lenient

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && cronSecret !== process.env.CRON_SECRET?.trim()) {
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

    const allHealthy = results.every((r) => r.healthy);
    return NextResponse.json(
      {
        healthy: allHealthy,
        checkedAt: new Date().toISOString(),
        jobs: results,
      },
      { status: allHealthy ? 200 : 503 }
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ healthy: false, error: err.message }, { status: 500 });
  }
}
