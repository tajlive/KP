// Minimal GlitchTip/Sentry SDK-compatible wrapper for Supabase Edge Functions.
// Reads DSN from GLITCHTIP_DSN or SENTRY_DSN env variable.

let sentryInitialized = false;

function getDsn(): string | undefined {
  return Deno.env.get("GLITCHTIP_DSN") || Deno.env.get("SENTRY_DSN");
}

export async function initSentry(): Promise<
  { captureException: (error: unknown, extra?: Record<string, unknown>) => void } | null
> {
  if (sentryInitialized) {
    return { captureException };
  }

  const dsn = getDsn();
  if (!dsn) return null;

  sentryInitialized = true;
  return { captureException };
}

function captureException(error: unknown, extra?: Record<string, unknown>): void {
  const dsn = getDsn();
  if (!dsn) return;

  const envelope = buildEnvelope(error, extra);
  if (!envelope) return;

  try {
    const url = new URL(dsn);
    const projectId = url.pathname.split("/").filter(Boolean).pop();
    if (!projectId) return;
    const ingestUrl = `${url.protocol}//${url.host}/api/${projectId}/envelope/`;

    fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
    }).catch(() => {});
  } catch {
    // Ignore transport errors
  }
}

function buildEnvelope(error: unknown, extra?: Record<string, unknown>): Uint8Array | null {
  const dsn = getDsn();
  if (!dsn) return null;

  const url = new URL(dsn);
  const projectId = url.pathname.split("/").filter(Boolean).pop();
  if (!projectId) return null;

  const eventId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const headers = {
    event_id: eventId,
    sent_at: new Date().toISOString(),
    dsn: `${url.protocol}//${url.username}@${url.host}/${projectId}`,
  };

  const payload = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: "javascript",
    environment: Deno.env.get("ENVIRONMENT") || "production",
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : "Error",
          value: error instanceof Error ? error.message : String(error),
          stacktrace: error instanceof Error ? { frames: parseStack(error.stack) } : undefined,
        },
      ],
    },
    extra,
  };

  const item = {
    type: "event",
    content_type: "application/json",
    length: 0,
  };

  const body = JSON.stringify(payload);
  item.length = new TextEncoder().encode(body).length;

  const envelope = `${JSON.stringify(headers)}\n${JSON.stringify(item)}\n${body}`;
  return new TextEncoder().encode(envelope);
}

function parseStack(stack?: string): Array<{ filename?: string; lineno?: number; colno?: number; function?: string }> {
  if (!stack) return [];
  return stack.split("\n").slice(1).map((line) => {
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
    if (!match) return {};
    return {
      function: match[1],
      filename: match[2],
      lineno: parseInt(match[3], 10),
      colno: parseInt(match[4], 10),
    };
  });
}

export async function captureEdgeFunctionError(
  functionName: string,
  error: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  const sentry = await initSentry();
  if (!sentry) return;
  sentry.captureException(error, { ...extra, edge_function: functionName });
}
