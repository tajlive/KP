/**
 * 🐛 Minimal Sentry SDK-compatible error tracking wrapper
 *
 * Klarpakke har migrert bort fra Sentry SaaS til selv-hostet GlitchTip
 * (Sentry SDK-kompatibel). Denne filen opprettholder en Sentry-liknende API
 * slik at eksisterende kallere ikke knekker.
 *
 * I produksjon kan `NEXT_PUBLIC_GLITCHTIP_DSN` peke til selv-hostet GlitchTip.
 * Uten DSN logges events til konsollen.
 *
 * Global error hooks (unhandledrejection, onerror) settes opp automatisk
 * ved init() i produksjon.
 */

export type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

interface User {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

interface Breadcrumb {
  category?: string;
  message?: string;
  level?: SeverityLevel;
  data?: Record<string, unknown>;
}

export interface ScopeLike {
  setExtra: (key: string, value: unknown) => void;
  setLevel: (level: SeverityLevel) => void;
  setTag: (key: string, value: string) => void;
  setUser: (user: User | null) => void;
  addBreadcrumb?: (breadcrumb: Breadcrumb) => void;
}

interface ScopeState {
  extras: Record<string, unknown>;
  tags: Record<string, string>;
  level?: SeverityLevel;
  user?: User | null;
}

let enabled = process.env.NODE_ENV === "production";
const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
let currentUser: User | null = null;

const scopeStack: ScopeState[] = [];

function generateEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function currentScope(): ScopeState {
  const top = scopeStack[scopeStack.length - 1];
  if (top) return top;
  return { extras: {}, tags: {}, user: currentUser };
}

function shouldSend(): boolean {
  return enabled && !!dsn;
}

export function logToConsole(
  type: "exception" | "message",
  data: unknown,
  level: SeverityLevel,
  context?: { extras?: Record<string, unknown>; tags?: Record<string, string> },
) {
  const payload = {
    type,
    level,
    data,
    ...context,
    user: currentScope().user,
    timestamp: new Date().toISOString(),
  };

  if (level === "fatal" || level === "error") {
    console.error("[GlitchTip]", payload);
  } else if (level === "warning") {
    console.warn("[GlitchTip]", payload);
  } else {
    console.info("[GlitchTip]", payload);
  }
}

/** Send event to Sentry/GlitchTip via store API */
async function sendToSentry(event: Record<string, unknown>) {
  try {
    const dsnValue = process.env.NEXT_PUBLIC_GLITCHTIP_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsnValue) return;

    // Parse DSN: https://publicKey@host/projectId
    const dsnUrl = new URL(dsnValue);
    const projectId = dsnUrl.pathname.replace("/", "");
    const publicKey = dsnUrl.username;
    const host = dsnUrl.hostname;
    const protocol = dsnUrl.protocol;
    const port = dsnUrl.port ? `:${dsnUrl.port}` : "";

    const url = `${protocol}//${host}${port}/api/${projectId}/store/`;

    const body = JSON.stringify({
      event_id: event.eventId,
      timestamp: event.timestamp,
      level: event.level,
      logger: "hermes",
      message: event.message || event.logentry,
      exception: event.exception
        ? {
            values: [event.exception],
          }
        : undefined,
      tags: event.tags || {},
      extra: event.extra || {},
      user: event.user || {},
      logentry: event.logentry,
      platform: "javascript",
      sdk: { name: "klarpakke-sentry", version: "1.0.0" },
    });

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=klarpakke/1.0.0, sentry_key=${publicKey}`,
      },
      body,
    });
  } catch {
    // Silent — don't crash the app if Sentry is unreachable
  }
}

const scopeProxy: ScopeLike = {
  setExtra(key: string, value: unknown) {
    currentScope().extras[key] = value;
  },
  setLevel(level: SeverityLevel) {
    currentScope().level = level;
  },
  setTag(key: string, value: string) {
    currentScope().tags[key] = value;
  },
  setUser(user: User | null) {
    const scope = currentScope();
    scope.user = user;
    if (scopeStack.length === 0) {
      currentUser = user;
    }
  },
};

export function captureException(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): string {
  const scope = currentScope();
  const extras = { ...scope.extras, ...context?.extra };
  const tags = { ...scope.tags, ...context?.tags };
  const level = scope.level ?? "error";
  const eventId = generateEventId();

  if (process.env.NODE_ENV === "development" || !shouldSend()) {
    logToConsole("exception", error, level, { extras, tags });
    return eventId;
  }

  // Send envelope to Sentry/GlitchTip DSN
  sendToSentry({
    eventId,
    timestamp: new Date().toISOString(),
    level,
    message: error instanceof Error ? error.message : String(error),
    exception: {
      type: error instanceof Error ? error.constructor.name : "Error",
      value: error instanceof Error ? error.message : String(error),
      stacktrace: error instanceof Error ? error.stack : undefined,
    },
    tags: { ...tags },
    extra: { ...extras },
    user: currentScope().user,
  });
  return eventId;
}

export function captureMessage(
  message: string,
  levelOrOpts:
    | SeverityLevel
    | { level?: SeverityLevel; tags?: Record<string, string>; extra?: Record<string, unknown> } = "info",
): string {
  let level: SeverityLevel;
  let tags: Record<string, string> | undefined;
  let extras: Record<string, unknown> | undefined;

  if (typeof levelOrOpts === "string") {
    level = levelOrOpts;
  } else {
    level = levelOrOpts.level ?? "info";
    tags = levelOrOpts.tags;
    extras = levelOrOpts.extra;
  }

  const scope = currentScope();
  const mergedExtras = { ...scope.extras, ...extras };
  const mergedTags = { ...scope.tags, ...tags };
  const finalLevel = scope.level ?? level;
  const eventId = generateEventId();

  if (process.env.NODE_ENV === "development" || !shouldSend()) {
    logToConsole("message", message, finalLevel, { extras: mergedExtras, tags: mergedTags });
    return eventId;
  }

  // Send to Sentry/GlitchTip
  sendToSentry({
    eventId,
    timestamp: new Date().toISOString(),
    level: finalLevel,
    message,
    logentry: { message, params: [] },
    tags: { ...mergedTags },
    extra: { ...mergedExtras },
    user: currentScope().user,
  });
  return eventId;
}

export function setUser(user: User | null) {
  currentUser = user;
}

export function setTag(key: string, value: string) {
  if (!shouldSend()) return;
  console.info("[GlitchTip] setTag", { key, value });
}

export function addBreadcrumb(breadcrumb: Breadcrumb) {
  if (!shouldSend()) return;
  console.info("[GlitchTip] breadcrumb", breadcrumb);
}

export function withScope(callback: (scope: ScopeLike) => void) {
  scopeStack.push({ extras: {}, tags: {} });
  try {
    callback(scopeProxy);
  } finally {
    scopeStack.pop();
  }
}

export function init(options?: { dsn?: string; environment?: string; enabled?: boolean }) {
  if (options?.enabled !== undefined) {
    enabled = options.enabled;
  }
  if (options?.dsn) {
    // DSN settes vanligvis via env, men støtter også runtime override.
    console.info("[GlitchTip] init", { dsn: options.dsn, environment: options.environment });
  }
}

/** Compatibility shim for legacy Sentry SDK integration factories. */
export function browserTracingIntegration(): { name: string } {
  return { name: "BrowserTracing" };
}

export function replayIntegration(): { name: string } {
  return { name: "Replay" };
}

export function httpIntegration(): { name: string } {
  return { name: "Http" };
}

export function captureRequestError(error: Error, _request: unknown): void {
  captureException(error);
}

/**
 * Log en error til GlitchTip med ekstra kontekst
 * @deprecated Bruk captureException direkte.
 */
export function logError(
  error: Error | string,
  context?: Record<string, unknown>,
  level: SeverityLevel = "error",
) {
  withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    scope.setLevel(level);

    if (typeof error === "string") {
      captureMessage(error, level);
    } else {
      captureException(error, { extra: context });
    }
  });
}

/**
 * Log en message til GlitchTip
 * @deprecated Bruk captureMessage direkte.
 */
export function logMessage(
  message: string,
  level: SeverityLevel = "info",
  context?: Record<string, unknown>,
) {
  withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    scope.setLevel(level);
    captureMessage(message, level);
  });
}

/** Throttle: unngå støy ved gjentatte poll-feil (hvert ~28s). */
let lastTradingIntegrityPollFailureAt = 0;
const TRADING_INTEGRITY_POLL_FAILURE_THROTTLE_MS = 5 * 60 * 1000;

export function reportTradingIntegrityPollFailure(
  context?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "production") return;
  try {
    addBreadcrumb({
      category: "trading_integrity",
      message: "trades_poll_failed",
      level: "warning",
      data: context,
    });
    const now = Date.now();
    if (
      now - lastTradingIntegrityPollFailureAt <
      TRADING_INTEGRITY_POLL_FAILURE_THROTTLE_MS
    ) {
      return;
    }
    lastTradingIntegrityPollFailureAt = now;
    const surface =
      typeof context?.surface === "string" ? context.surface : "unknown";
    captureMessage(
      `Trading integrity: trades poll failed (${surface})`,
      "warning",
    );
  } catch {
    /* noop */
  }
}

let lastTradeHistoryEmptyReportAt = 0;
const TRADE_HISTORY_EMPTY_THROTTLE_MS = 30 * 60 * 1000;

export function reportTradeHistoryEmptyWhileSignedIn(
  context?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "production") return;
  try {
    addBreadcrumb({
      category: "trading_integrity",
      message: "trade_history_empty_success",
      level: "info",
      data: context,
    });
    const now = Date.now();
    if (now - lastTradeHistoryEmptyReportAt < TRADE_HISTORY_EMPTY_THROTTLE_MS) {
      return;
    }
    lastTradeHistoryEmptyReportAt = now;
    captureMessage(
      "Trading integrity: trade history empty (signed in, API OK)",
      "info",
    );
  } catch {
    /* noop */
  }
}

/** Bruker trykket manuell synk på dashboard (observabilitet, ikke PII). */
export function reportTradingIntegrityManualSync() {
  if (process.env.NODE_ENV !== "production") return;
  try {
    addBreadcrumb({
      category: "trading_integrity",
      message: "manual_dashboard_sync",
      level: "info",
    });
  } catch {
    /* noop */
  }
}

/**
 * Spor kritiske handlinger for produktinnsikt (audit 4.6).
 * Brukes f.eks. ved registrering, checkout, første trade.
 */
export function trackCriticalAction(
  action: "signup" | "checkout" | "first_trade" | "onboarding_complete",
  context?: { userId?: string; requestId?: string; [key: string]: unknown },
) {
  if (process.env.NODE_ENV !== "production") return;
  try {
    addBreadcrumb({
      category: "critical_action",
      message: action,
      level: "info",
      data: context,
    });
    if (context?.userId) {
      setTag("critical_action", action);
    }
  } catch {
    // GlitchTip ikke tilgjengelig
  }
}

/**
 * Test GlitchTip connection (kun i produksjon)
 */
export function testSentry() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  captureMessage("GlitchTip test triggered", {
    level: "info",
    extra: { test: true, timestamp: new Date().toISOString() },
  });

  const testError = new Error("Test error - can be ignored");
  captureException(testError, { extra: { test: true } });
}
