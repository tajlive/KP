import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * GET /api/test-sentry
 * Triggers a server-side test event in Sentry (production only, when DSN is set).
 * Used by the dashboard Sentry test page to verify server error tracking.
 */
export async function GET() {
  const isProduction = process.env.NODE_ENV === "production";
  const hasDSN = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!isProduction || !hasDSN) {
    return NextResponse.json(
      {
        message:
          "Sentry server test is only active in production with NEXT_PUBLIC_SENTRY_DSN set.",
        sent: false,
      },
      { status: 200 },
    );
  }

  try {
    const testId = Date.now();
    const error = new Error(
      `🔴 TEST ${testId}: Server-side error from /api/test-sentry`,
    );
    Sentry.captureException(error, {
      tags: { test_type: "server_api_manual" },
      extra: { test_id: testId },
    });
    return NextResponse.json({
      message: `Server test error ${testId} sent to Sentry. Check your dashboard in ~30s.`,
      sent: true,
    });
  } catch (err) {
    console.error("[test-sentry]", err);
    return NextResponse.json(
      { message: "Failed to send test event", sent: false },
      { status: 500 },
    );
  }
}
