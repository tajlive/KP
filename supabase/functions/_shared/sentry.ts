// Minimal Sentry wrapper for Supabase Edge Functions
let sentryInitialized = false;

export async function initSentry(): Promise<typeof import("https://esm.sh/@sentry/browser@7.120.0") | null> {
  if (sentryInitialized) {
    try {
      return await import("https://esm.sh/@sentry/browser@7.120.0");
    } catch {
      return null;
    }
  }

  const dsn = Deno.env.get("SENTRY_DSN") || Deno.env.get("NEXT_PUBLIC_SENTRY_DSN");
  if (!dsn) return null;

  try {
    const Sentry = await import("https://esm.sh/@sentry/browser@7.120.0");
    Sentry.init({
      dsn,
      environment: Deno.env.get("ENVIRONMENT") || "production",
      tracesSampleRate: 0.1,
    });
    sentryInitialized = true;
    return Sentry;
  } catch (err) {
    console.warn("Sentry init failed:", err);
    return null;
  }
}

export async function captureEdgeFunctionError(
  functionName: string,
  error: unknown,
  extra?: Record<string, unknown>
): Promise<void> {
  const Sentry = await initSentry();
  if (!Sentry) return;

  Sentry.withScope((scope) => {
    scope.setTag("edge_function", functionName);
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}
