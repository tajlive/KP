/**
 * API v1: Cron Jobs Consolidated Endpoint
 * 
 * Delegates to existing cron implementations:
 * - /api/cron/daily-summary
 * - /api/cron/update-usdt-nok  
 * - /api/cron/keepalive
 * 
 * Secured with CRON_SECRET header
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/auth/verify-cron";

const CRON_JOBS = [
  "daily-summary",
  "update-usdt-nok",
  "keepalive",
] as const;

type CronJob = (typeof CRON_JOBS)[number];

function isValidJob(job: string): job is CronJob {
  return CRON_JOBS.includes(job as CronJob);
}

/**
 * POST handler - executes the requested cron job
 * Delegates to existing cron route implementations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ job: string }> }
) {
  const { job } = await params;
  
  if (!isValidJob(job)) {
    return NextResponse.json(
      { error: "Unknown job", validJobs: CRON_JOBS },
      { status: 400 }
    );
  }

  // Verify CRON_SECRET using existing auth helper
  const authError = verifyCronRequest(request);
  if (authError) {
    console.warn(`[v1/cron/${job}] Unauthorized cron attempt`);
    return authError;
  }

  const startTime = Date.now();

  try {
    let result: unknown;

    switch (job) {
      case "daily-summary": {
        // Delegate to existing daily-summary route handler
        const { GET: dailySummaryHandler } = await import("@/app/api/cron/daily-summary/route");
        const response = await dailySummaryHandler(request);
        result = await response.json();
        break;
      }

      case "update-usdt-nok": {
        // Delegate to existing update-usdt-nok route handler
        const { GET: updateUsdtNokHandler } = await import("@/app/api/cron/update-usdt-nok/route");
        const response = await updateUsdtNokHandler(request);
        result = await response.json();
        break;
      }

      case "keepalive": {
        // Delegate to existing keepalive route handler
        const { GET: keepaliveHandler } = await import("@/app/api/cron/keepalive/route");
        const response = await keepaliveHandler(request);
        result = await response.json();
        break;
      }

      default:
        return NextResponse.json(
          { error: "Job not implemented" },
          { status: 501 }
        );
    }

    const duration = Date.now() - startTime;
    return NextResponse.json({
      ok: true,
      job,
      duration_ms: duration,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[v1/cron/${job}]`, error);
    return NextResponse.json(
      { 
        error: "Cron job failed", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - returns job info and metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ job: string }> }
) {
  const { job } = await params;
  
  if (!isValidJob(job)) {
    return NextResponse.json(
      { error: "Unknown job", validJobs: CRON_JOBS },
      { status: 400 }
    );
  }

  return NextResponse.json({
    job,
    status: "active",
    description: getJobDescription(job),
    schedule: getJobSchedule(job),
    endpoint: `/api/v1/cron/${job}`,
  });
}

function getJobDescription(job: CronJob): string {
  const descriptions: Record<CronJob, string> = {
    "daily-summary": "Send daily trading summary emails to users",
    "update-usdt-nok": "Update USDT to NOK exchange rate from external API",
    "keepalive": "Keep Supabase project active and prevent idle mode",
  };
  return descriptions[job];
}

function getJobSchedule(job: CronJob): string | null {
  const schedules: Partial<Record<CronJob, string>> = {
    "daily-summary": "0 7 * * *",
    "update-usdt-nok": "0 6 * * *",
    "keepalive": "0 6 */5 * *",
  };
  return schedules[job] ?? null;
}
