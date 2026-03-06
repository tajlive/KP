/**
 * 🐛 Sentry Test API
 * 
 * Brukes for å verifisere at Sentry fungerer korrekt
 * POST /api/sentry-test
 */

import { NextResponse } from "next/server";
import { logError, logMessage, testSentry } from "@/lib/sentry";

export async function POST() {
  try {
    // Log en test message
    logMessage("Sentry test initiated from API", "info", {
      endpoint: "/api/sentry-test",
      method: "POST",
    });

    // Test Sentry connection
    testSentry();

    return NextResponse.json({
      success: true,
      message: "Sentry test triggered. Check your Sentry dashboard.",
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ? "✅ Configured" : "❌ Missing",
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(error instanceof Error ? error : "Unknown error", {
      endpoint: "/api/sentry-test",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to test Sentry",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Sentry Test Endpoint",
    usage: "POST to /api/sentry-test to trigger test",
    sentryConfigured: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
  });
}
