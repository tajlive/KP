import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const errorId = Date.now();
    const error = new Error(
      `🔴 TEST ${errorId}: Server-side error from API route`,
    );

    Sentry.captureException(error, {
      tags: {
        test_type: "server_api",
        api_route: "/api/test-sentry",
      },
      extra: {
        test_id: errorId,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Server error ${errorId} sent to Sentry`,
      errorId,
    });
  } catch (error) {
    console.error("Failed to send test error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send test error" },
      { status: 500 },
    );
  }
}
