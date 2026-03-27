/**
 * API v1 Client
 * 
 * Consolidated API client for Klarpakke API v1 endpoints.
 * Replaces scattered API calls with a unified, type-safe client.
 * 
 * Migration from legacy endpoints:
 * - /api/trading/* → /api/v1/trading/*
 * - /api/paper-trading/* → /api/v1/trading/*?mode=paper
 * - /api/webhooks/* → /api/v1/webhooks/*
 * - /api/cron/* → /api/v1/cron/*
 * - /api/notifications/* → /api/v1/notifications/*
 */

// Trading mode type
type TradingMode = "live" | "paper";

// Base configuration
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || "v1";
const API_BASE = `/api/${API_VERSION}`;

// Endpoint definitions
export const endpoints = {
  trading: `${API_BASE}/trading`,
  webhooks: `${API_BASE}/webhooks`,
  cron: `${API_BASE}/cron`,
  notifications: `${API_BASE}/notifications`,
  // Legacy endpoints (kept for backwards compatibility during transition)
  legacy: {
    stripeWebhook: "/api/webhooks/stripe", // Keep original for signature verification
  },
} as const;

// ============================================================================
// Trading API
// ============================================================================

/**
 * Build trading endpoint URL with optional paper mode
 */
export function getTradingEndpoint(
  action: string,
  mode: TradingMode = "live"
): string {
  const url = new URL(`${endpoints.trading}/${action}`, window.location.origin);
  if (mode === "paper") {
    url.searchParams.set("mode", "paper");
  }
  return url.toString();
}

interface ExecuteTradeRequest {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  type?: "MARKET" | "LIMIT";
  price?: number;
}

interface ExecuteTradeResponse {
  success: boolean;
  tradeId?: string;
  error?: string;
  executedPrice?: number;
  executedQuantity?: number;
}

/**
 * Execute a trade (live or paper)
 */
export async function executeTrade(
  data: ExecuteTradeRequest,
  mode: TradingMode = "live"
): Promise<ExecuteTradeResponse> {
  const response = await fetch(getTradingEndpoint("execute", mode), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Trade failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get current trading mode for user
 */
export async function getTradingMode(): Promise<{ mode: TradingMode }> {
  const response = await fetch(getTradingEndpoint("mode", "live"));
  if (!response.ok) throw new Error("Failed to get trading mode");
  return response.json();
}

/**
 * Set trading mode
 */
export async function setTradingMode(mode: TradingMode): Promise<void> {
  const response = await fetch(getTradingEndpoint("mode", "live"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!response.ok) throw new Error("Failed to set trading mode");
}

/**
 * Get order book depth
 */
export async function getOrderBookDepth(
  symbol: string
): Promise<{ bids: [number, number][]; asks: [number, number][] }> {
  const url = new URL(`${endpoints.trading}/depth`, window.location.origin);
  url.searchParams.set("symbol", symbol);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Failed to get order book");
  return response.json();
}

/**
 * Get current price for symbol
 */
export async function getCurrentPrice(symbol: string): Promise<{ price: number; change24h: number }> {
  const url = new URL(`${endpoints.trading}/price`, window.location.origin);
  url.searchParams.set("symbol", symbol);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Failed to get price");
  return response.json();
}

// ============================================================================
// Notifications API
// ============================================================================

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToNotifications(
  subscription: PushSubscription,
  channel: string = "default"
): Promise<{ success: boolean }> {
  const response = await fetch(`${endpoints.notifications}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription, channel }),
  });

  if (!response.ok) throw new Error("Failed to subscribe");
  return response.json();
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromNotifications(
  channel: string = "default"
): Promise<{ success: boolean }> {
  const response = await fetch(`${endpoints.notifications}/unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel }),
  });

  if (!response.ok) throw new Error("Failed to unsubscribe");
  return response.json();
}

/**
 * Get notification subscription status
 */
export async function getNotificationStatus(): Promise<{
  subscribed: boolean;
  channels: string[];
}> {
  const response = await fetch(`${endpoints.notifications}/status`);
  if (!response.ok) throw new Error("Failed to get status");
  return response.json();
}

// ============================================================================
// Webhooks (Info only - webhooks are server-side)
// ============================================================================

/**
 * Get webhook provider info
 */
export async function getWebhookInfo(
  provider: "stripe" | "resend" | "github"
): Promise<{ provider: string; events: string[] }> {
  const response = await fetch(`${endpoints.webhooks}/${provider}`);
  if (!response.ok) throw new Error("Failed to get webhook info");
  return response.json();
}

// ============================================================================
// Cron (Admin only)
// ============================================================================

/**
 * Trigger a cron job manually (requires admin/CRON_SECRET)
 */
export async function triggerCronJob(
  job: string,
  secret: string
): Promise<{ ok: boolean; duration_ms: number; result: any }> {
  const response = await fetch(`${endpoints.cron}/${job}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Cron job failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get cron job info
 */
export async function getCronJobInfo(job: string): Promise<{
  job: string;
  status: string;
  description: string;
}> {
  const response = await fetch(`${endpoints.cron}/${job}`);
  if (!response.ok) throw new Error("Failed to get cron info");
  return response.json();
}

// ============================================================================
// Legacy API (for gradual migration)
// ============================================================================

/**
 * @deprecated Use executeTrade from api-client instead
 */
export async function legacyExecutePaperTrade(data: ExecuteTradeRequest) {
  console.warn("[DEPRECATED] Using legacy paper trading endpoint");
  return executeTrade(data, "paper");
}

/**
 * @deprecated Use executeTrade from api-client instead  
 */
export async function legacyExecuteLiveTrade(data: ExecuteTradeRequest) {
  console.warn("[DEPRECATED] Using legacy live trading endpoint");
  return executeTrade(data, "live");
}

// ============================================================================
// Error handling
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: Response
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Generic API fetch wrapper with error handling
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(
      error.error || `API error: ${response.status}`,
      response.status,
      response
    );
  }

  return response.json();
}

// Export default for convenience
export default {
  endpoints,
  executeTrade,
  getTradingMode,
  setTradingMode,
  getOrderBookDepth,
  getCurrentPrice,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  getNotificationStatus,
  triggerCronJob,
  getCronJobInfo,
};
