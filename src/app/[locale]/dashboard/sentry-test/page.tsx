"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

export default function SentryTestPage() {
  const [lastTest, setLastTest] = useState<string>("");
  const [testResults, setTestResults] = useState<
    Array<{ type: string; success: boolean; timestamp: Date }>
  >([]);

  const addResult = (type: string, success: boolean) => {
    setTestResults((prev) => [
      ...prev,
      { type, success, timestamp: new Date() },
    ]);
  };

  const testClientError = () => {
    try {
      const errorId = Date.now();
      const error = new Error(
        `🔴 TEST ${errorId}: Client-side error from dashboard`,
      );
      Sentry.captureException(error, {
        tags: { test_type: "client_manual" },
        extra: { test_id: errorId },
      });
      setLastTest(`Client error ${errorId} sent`);
      addResult("Client Error (Manual)", true);
    } catch (error) {
      console.error(error);
      addResult("Client Error (Manual)", false);
    }
  };

  const testServerError = async () => {
    try {
      const res = await fetch("/api/test-sentry");
      const data = await res.json();
      if (res.ok) {
        setLastTest(data.message);
        addResult("Server Error", true);
      } else {
        addResult("Server Error", false);
      }
    } catch (error) {
      console.error(error);
      addResult("Server Error", false);
    }
  };

  const testUnhandledError = () => {
    setLastTest("Throwing unhandled error...");
    addResult("Unhandled Error", true);
    setTimeout(() => {
      throw new Error("🔴 TEST: Unhandled error (will be caught by Sentry)");
    }, 100);
  };

  const testBreadcrumbs = () => {
    Sentry.addBreadcrumb({
      category: "test",
      message: "User clicked test button",
      level: "info",
    });
    Sentry.addBreadcrumb({
      category: "test",
      message: "Simulating user actions",
      level: "debug",
    });
    const error = new Error("🔴 TEST: Error with breadcrumbs");
    Sentry.captureException(error);
    setLastTest("Error with breadcrumbs sent");
    addResult("Breadcrumbs Test", true);
  };

  const testPerformance = async () => {
    await Sentry.startSpan(
      { name: "test-performance-transaction", op: "test" },
      async () => {
        await Sentry.startSpan(
          { name: "test-operation", op: "test-operation" },
          async () => {
            // Simulate work
            await new Promise((resolve) => setTimeout(resolve, 1000));
          },
        );
      },
    );

    setLastTest("Performance transaction sent");
    addResult("Performance Test", true);
  };

  const hasDSN = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
  const isProduction = process.env.NODE_ENV === "production";
  const sentryEnabled = isProduction;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Sentry Test Dashboard</CardTitle>
          <CardDescription>
            Test Sentry error tracking and verify production monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Section */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Configuration Status
            </h3>
            <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
              <div className="flex items-center gap-2">
                {hasDSN ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>
                  NEXT_PUBLIC_SENTRY_DSN:{" "}
                  {hasDSN ? "✅ Configured" : "❌ Missing"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <span>Environment: {process.env.NODE_ENV}</span>
              </div>
              <div className="flex items-center gap-2">
                {sentryEnabled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-500" />
                )}
                <span>
                  Sentry Enabled:{" "}
                  {sentryEnabled ? "✅ Active" : "⚠️ Disabled (dev mode)"}
                </span>
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          {!isProduction && (
            <Alert variant="default" className="border-amber-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Development Mode:</strong> Sentry is disabled locally.
                Deploy to production to see real errors in the dashboard.
              </AlertDescription>
            </Alert>
          )}

          {/* Test Buttons */}
          <div>
            <h3 className="font-semibold mb-3">Error Test Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={testClientError}
                variant="outline"
                className="w-full justify-start"
              >
                1️⃣ Client Error (Captured)
              </Button>

              <Button
                onClick={testServerError}
                variant="outline"
                className="w-full justify-start"
              >
                2️⃣ Server API Error
              </Button>

              <Button
                onClick={testBreadcrumbs}
                variant="outline"
                className="w-full justify-start"
              >
                3️⃣ Error with Breadcrumbs
              </Button>

              <Button
                onClick={testPerformance}
                variant="outline"
                className="w-full justify-start"
              >
                4️⃣ Performance Transaction
              </Button>

              <Button
                onClick={testUnhandledError}
                variant="destructive"
                className="w-full justify-start md:col-span-2"
              >
                ⚠️ Unhandled Error (Will Crash Page)
              </Button>

              <Button
                onClick={() => {
                  throw new Error("This is your first error!");
                }}
                variant="destructive"
                className="w-full justify-start md:col-span-2"
              >
                🧨 Break the world
              </Button>
            </div>
          </div>

          {/* Last Test Result */}
          {lastTest && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{lastTest}</AlertDescription>
            </Alert>
          )}

          {/* Test Results History */}
          {testResults.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Test Results History</h3>
              <div className="space-y-2">
                {testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-muted p-3 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>{result.type}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2 text-sm">
            <p className="font-medium">📋 How to Verify:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click any test button above</li>
              <li>Wait 30 seconds for events to process</li>
              <li>
                Open Sentry dashboard:{" "}
                <a
                  href="https://elbatt-chatbot.sentry.io/issues/?project=klarpakke-production"
                  className="underline text-blue-600 dark:text-blue-400"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Issues
                </a>
              </li>
              <li>Find your test error by searching for "TEST"</li>
              <li>
                Click to see full stack trace, breadcrumbs, and session replay
              </li>
            </ol>
          </div>

          {/* Links */}
          <div className="flex gap-3">
            <Button variant="outline" asChild className="flex-1">
              <a
                href="https://elbatt-chatbot.sentry.io/issues/?project=klarpakke-production"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Sentry Dashboard →
              </a>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <a href="/dashboard">← Back to Dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
