/**
 * Enterprise JSON-structured logger with correlation ID support.
 *
 * Outputs JSON to stdout for Cloudflare Workers log aggregation.
 * Correlation IDs link logs across requests for distributed tracing.
 *
 * Usage:
 *   logger.info("Trade executed", { tradeId: "abc", amount: 100 });
 *   → {"ts":"2026-07-27T...","level":"info","msg":"Trade executed","tradeId":"abc","amount":100,"correlationId":"req_abc123"}
 */

const isDevelopment = process.env.NODE_ENV === "development";

// In-memory correlation ID store (per-request in middleware)
let _correlationId: string | null = null;

/** Get the current request's correlation ID */
export function getCorrelationId(): string {
  return _correlationId ?? "unknown";
}

/** Set correlation ID for the current request (called by middleware) */
export function setCorrelationId(id: string): void {
  _correlationId = id;
}

/** Generate a compact correlation ID */
export function generateCorrelationId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `req_${id}`;
}

interface LogEntry {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  correlationId: string;
  [key: string]: unknown;
}

function formatJson(level: LogEntry["level"], msg: string, ctx?: unknown): string {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    correlationId: _correlationId ?? "unknown",
  };
  if (ctx && typeof ctx === "object" && !Array.isArray(ctx)) {
    Object.assign(entry, ctx as Record<string, unknown>);
  } else if (ctx !== undefined) {
    entry["value"] = ctx;
  }
  return JSON.stringify(entry);
}

export const logger = {
  debug: (msg: string, ctx?: unknown) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.debug(formatJson("debug", msg, ctx));
    }
  },

  info: (msg: string, ctx?: unknown) => {
    console.log(formatJson("info", msg, ctx));
  },

  warn: (msg: string, ctx?: unknown) => {
    console.warn(formatJson("warn", msg, ctx));
  },

  error: (msg: string, ctx?: unknown) => {
    console.error(formatJson("error", msg, ctx));
  },

  auth: (event: string, ctx?: unknown) => {
    logger.info(`auth:${event}`, ctx);
  },

  api: (method: string, endpoint: string, status?: number, ctx?: unknown) => {
    logger.info(`api:${method} ${endpoint}`, { status, ...(ctx && typeof ctx === "object" ? ctx as Record<string, unknown> : {}) });
  },
};
