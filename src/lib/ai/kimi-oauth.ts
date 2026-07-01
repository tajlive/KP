import { getRedisRest } from "@/lib/redis-client";

const OAUTH_TOKENS_KEY = "kimi:oauth:tokens";
const ACCESS_TOKEN_LEEWAY_MS = 60 * 1000;
const REFRESH_TOKEN_EXTRA_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Mirror of KIMI_MODELS from ./providers to avoid a circular dependency.
const KIMI_MODEL_VALUES: Record<string, true> = {
  "moonshot-v1-8k": true,
  "moonshot-v1-32k": true,
  "moonshot-v1-128k": true,
  "kimi-k2-5": true,
  "kimi-k2-6": true,
};

export interface KimiOAuthConfig {
  clientId: string;
  clientSecret?: string;
  deviceEndpoint: string;
  tokenEndpoint: string;
  scope: string;
}

export interface KimiDeviceSession {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
  expiresAt: number;
}

export interface KimiOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

export type KimiPollStatus =
  | { status: "pending" }
  | { status: "slow_down"; error?: string }
  | { status: "expired"; error?: string }
  | { status: "denied"; error?: string }
  | { status: string; error?: string };

export function getKimiOAuthConfig(): KimiOAuthConfig {
  return {
    clientId: process.env.KIMI_OAUTH_CLIENT_ID?.trim() || "",
    clientSecret: process.env.KIMI_OAUTH_CLIENT_SECRET?.trim() || undefined,
    deviceEndpoint:
      process.env.KIMI_OAUTH_DEVICE_ENDPOINT?.trim() ||
      "https://platform.moonshot.cn/oauth/device",
    tokenEndpoint:
      process.env.KIMI_OAUTH_TOKEN_ENDPOINT?.trim() ||
      "https://platform.moonshot.cn/oauth/token",
    scope: process.env.KIMI_OAUTH_SCOPE?.trim() || "openid profile",
  };
}

export function isKimiOAuthConfigured(): boolean {
  return Boolean(getKimiOAuthConfig().clientId);
}

export async function getKimiOAuthTokens(): Promise<KimiOAuthTokens | null> {
  const kv = getRedisRest();
  if (!kv) return null;
  return kv.get<KimiOAuthTokens>(OAUTH_TOKENS_KEY);
}

export async function initiateDeviceFlow(): Promise<KimiDeviceSession> {
  const config = getKimiOAuthConfig();
  if (!config.clientId) {
    throw new Error("KIMI_OAUTH_CLIENT_ID is not configured");
  }

  const params = new URLSearchParams();
  params.append("client_id", config.clientId);
  if (config.clientSecret) {
    params.append("client_secret", config.clientSecret);
  }
  if (config.scope) {
    params.append("scope", config.scope);
  }

  const response = await fetch(config.deviceEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kimi device flow error: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval?: number;
  };

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 1800;
  const interval = typeof data.interval === "number" ? data.interval : 5;

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn,
    interval,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export async function pollAccessToken(
  deviceCode: string
): Promise<KimiOAuthTokens | KimiPollStatus> {
  const config = getKimiOAuthConfig();
  if (!config.clientId) {
    throw new Error("KIMI_OAUTH_CLIENT_ID is not configured");
  }

  const params = new URLSearchParams();
  params.append(
    "grant_type",
    "urn:ietf:params:oauth:grant-type:device_code"
  );
  params.append("device_code", deviceCode);
  params.append("client_id", config.clientId);
  if (config.clientSecret) {
    params.append("client_secret", config.clientSecret);
  }

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (data.error || !response.ok) {
    const error = String(data.error || "unknown");
    const errorDescription =
      typeof data.error_description === "string"
        ? data.error_description
        : undefined;

    switch (error) {
      case "authorization_pending":
        return { status: "pending" };
      case "slow_down":
        return { status: "slow_down", error: errorDescription };
      case "expired_token":
        return { status: "expired", error: errorDescription };
      case "access_denied":
        return { status: "denied", error: errorDescription };
      default:
        return { status: error, error: errorDescription };
    }
  }

  const tokens = oauthTokensFromResponse(data);
  await storeKimiOAuthTokens(tokens);
  return tokens;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<KimiOAuthTokens> {
  const config = getKimiOAuthConfig();
  if (!config.clientId) {
    throw new Error("KIMI_OAUTH_CLIENT_ID is not configured");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("client_id", config.clientId);
  if (config.clientSecret) {
    params.append("client_secret", config.clientSecret);
  }

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (data.error || !response.ok) {
    const error = String(data.error || "unknown");
    const errorDescription =
      typeof data.error_description === "string"
        ? data.error_description
        : undefined;
    throw new Error(
      `Kimi token refresh error: ${response.status} - ${error}${
        errorDescription ? `: ${errorDescription}` : ""
      }`
    );
  }

  const tokens = oauthTokensFromResponse(data);
  await storeKimiOAuthTokens(tokens);
  return tokens;
}

export async function getValidKimiAccessToken(): Promise<string | null> {
  const kv = getRedisRest();
  if (!kv) return null;

  const tokens = await kv.get<KimiOAuthTokens>(OAUTH_TOKENS_KEY);
  if (!tokens) return null;

  const now = Date.now();
  if (now < tokens.expiresAt - ACCESS_TOKEN_LEEWAY_MS) {
    return tokens.accessToken;
  }

  if (tokens.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      return refreshed.accessToken;
    } catch {
      await clearKimiOAuthTokens();
      return null;
    }
  }

  return null;
}

export async function storeKimiOAuthTokens(
  tokens: KimiOAuthTokens
): Promise<void> {
  const kv = getRedisRest();
  if (!kv) {
    throw new Error("KV store is not available; cannot persist Kimi OAuth tokens");
  }

  // Base TTL on the access token lifetime, but keep the entry around long
  // enough to use the refresh token when the access token expires.
  let ttlMs = tokens.expiresAt - Date.now();
  if (ttlMs <= 0) {
    ttlMs = 60 * 1000;
  }
  if (tokens.refreshToken) {
    ttlMs = Math.max(ttlMs, REFRESH_TOKEN_EXTRA_TTL_MS);
  }
  const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));

  await kv.set(OAUTH_TOKENS_KEY, tokens, { ex: ttlSeconds });
}

export async function clearKimiOAuthTokens(): Promise<void> {
  const kv = getRedisRest();
  if (!kv) return;
  await kv.del(OAUTH_TOKENS_KEY);
}

export function getKimiCommonHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export function resolveKimiModel(aliasOrModel: string): {
  model: string;
  reasoningEffort?: "low" | "medium" | "high";
} {
  const normalized = aliasOrModel.trim().toLowerCase();

  if (
    normalized === "kimi k2.6 - [high]" ||
    normalized === "kimi-k2-6" ||
    normalized === "kimi-k2-6-high"
  ) {
    return { model: "kimi-k2-6", reasoningEffort: "high" };
  }

  if (KIMI_MODEL_VALUES[normalized]) {
    return { model: normalized };
  }

  return { model: aliasOrModel };
}

function oauthTokensFromResponse(data: Record<string, unknown>): KimiOAuthTokens {
  const accessToken = String(data.access_token || "");
  const refreshToken = String(data.refresh_token || "");
  const expiresIn =
    typeof data.expires_in === "number" ? data.expires_in : 3600;
  const tokenType = String(data.token_type || "Bearer");
  const scope =
    typeof data.scope === "string" ? data.scope : undefined;

  if (!accessToken) {
    throw new Error("Kimi token response missing access_token");
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    tokenType,
    scope,
  };
}
