import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

/**
 * Log a successful cron run to cron_job_runs
 */
export async function captureCronSuccess(
  jobName: string,
  startedAt: Date,
  finishedAt: Date
): Promise<void> {
  try {
    const db = await createClient();
    await db.from("cron_job_runs").insert({
      job_name: jobName,
      status: "success",
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } catch (err) {
    console.warn(`[captureCronSuccess] Failed to log success for ${jobName}:`, err);
  }
}

/**
 * Send Slack alert for cron errors if SLACK_WEBHOOK is configured
 */
export async function sendCronSlackAlert(
  cronName: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!process.env.SLACK_WEBHOOK) return;

  try {
    await fetch(process.env.SLACK_WEBHOOK, {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({
        text: `🚨 Klarpakke ${cronName} failed: ${message}\n${metadata ? "\n" + Object.entries(metadata).map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join("\n") : ""}`,
      }),
    });
  } catch {
    // Ignore Slack errors
  }
}

/**
 * Capture cron error in Sentry and send Slack alert
 */
export function captureCronError(
  cronName: string,
  error: Error,
  metadata?: Record<string, unknown>
): void {
  Sentry.withScope((scope) => {
    scope.setTag("cron_name", cronName);
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });

  // Fire-and-forget Slack alert
  void sendCronSlackAlert(cronName, error.message, metadata);
}

/**
 * Generate a deterministic idempotency key for trades.
 * Time is bucketed to prevent duplicates from Vercel cron retries.
 */
export function generateTradeIdempotencyKey(
  sessionId: string,
  symbol: string,
  side: string,
  bucketMinutes: number = 5
): string {
  const now = new Date();
  now.setMinutes(Math.floor(now.getMinutes() / bucketMinutes) * bucketMinutes, 0, 0);
  return `${sessionId}-${symbol}-${side}-${now.toISOString()}`;
}
