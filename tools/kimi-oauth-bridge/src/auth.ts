import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { BridgeConfig, KimiOAuthConfig } from "./config.js";

const ACCESS_TOKEN_LEEWAY_MS = 60 * 1000;
const REFRESH_TOKEN_EXTRA_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

export interface KimiPendingStatus {
  status: "pending";
}

export interface KimiSlowDownStatus {
  status: "slow_down";
  error?: string;
}

export interface KimiExpiredStatus {
  status: "expired";
  error?: string;
}

export interface KimiDeniedStatus {
  status: "denied";
  error?: string;
}

export interface KimiOtherStatus {
  status: string;
  error?: string;
}

export type KimiPollStatus =
  | KimiPendingStatus
  | KimiSlowDownStatus
  | KimiExpiredStatus
  | KimiDeniedStatus
  | KimiOtherStatus;

export function getKimiOAuthConfig(config: BridgeConfig): KimiOAuthConfig {
  return config.kimi;
}

export function isKimiOAuthConfigured(config: BridgeConfig): boolean {
  return Boolean(config.kimi.clientId);
}

export async function loadTokens(tokenFile: string): Promise<KimiOAuthTokens | null> {
  try {
    if (!existsSync(tokenFile)) return null;
    const raw = await readFile(tokenFile, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return parseTokens(parsed);
  } catch {
    return null;
  }
}

export async function saveTokens(
  tokenFile: string,
  tokens: KimiOAuthTokens
): Promise<void> {
  const dir = tokenFile.slice(0, Math.max(0, tokenFile.lastIndexOf("/")));
  if (dir) {
    await mkdir(dir, { recursive: true, mode: 0o700 });
  }
  await writeFile(tokenFile, `${JSON.stringify(tokens, null, 2)}\n`, { mode: 0o600 });
}

export async function clearTokens(tokenFile: string): Promise<void> {
  try {
    await rm(tokenFile, { force: true });
  } catch {
    // Ignore cleanup errors.
  }
}

export async function initiateDeviceFlow(
  config: BridgeConfig
): Promise<KimiDeviceSession> {
  const kimi = getKimiOAuthConfig(config);
  if (!kimi.clientId) {
    throw new Error("KIMI_OAUTH_CLIENT_ID is not configured");
  }

  const params = new URLSearchParams();
  params.append("client_id", kimi.clientId);
  if (kimi.clientSecret) {
    params.append("client_secret", kimi.clientSecret);
  }
  if (kimi.scope) {
    params.append("scope", kimi.scope);
  }

  const response = await fetch(kimi.deviceEndpoint, {
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
    device_code?: string;
    user_code?: string;
    verification_uri?: string;
    expires_in?: number;
    interval?: number;
  };

  const deviceCode = data.device_code;
  const userCode = data.user_code;
  const verificationUri = data.verification_uri;

  if (!deviceCode || !userCode || !verificationUri) {
    throw new Error("Kimi device flow response missing required fields");
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 1800;
  const interval = typeof data.interval === "number" ? data.interval : 5;

  return {
    deviceCode,
    userCode,
    verificationUri,
    expiresIn,
    interval,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export async function pollAccessToken(
  config: BridgeConfig,
  deviceCode: string
): Promise<KimiOAuthTokens | KimiPollStatus> {
  const kimi = getKimiOAuthConfig(config);
  if (!kimi.clientId) {
    throw new Error("KIMI_OAUTH_CLIENT_ID is not configured");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "urn:ietf:params:oauth:grant-type:device_code");
  params.append("device_code", deviceCode);
  params.append("client_id", kimi.clientId);
  if (kimi.clientSecret) {
    params.append("client_secret", kimi.clientSecret);
  }

  const response = await fetch(kimi.tokenEndpoint, {
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
      typeof data.error_description === "string" ? data.error_description : undefined;

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

  return oauthTokensFromResponse(data);
}

export async function refreshAccessToken(
  config: BridgeConfig,
  refreshToken: string
): Promise<KimiOAuthTokens> {
  const kimi = getKimiOAuthConfig(config);
  if (!kimi.clientId) {
    throw new Error("KIMI_OAUTH_CLIENT_ID is not configured");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("client_id", kimi.clientId);
  if (kimi.clientSecret) {
    params.append("client_secret", kimi.clientSecret);
  }

  const response = await fetch(kimi.tokenEndpoint, {
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
      typeof data.error_description === "string" ? data.error_description : undefined;
    throw new Error(
      `Kimi token refresh error: ${response.status} - ${error}${
        errorDescription ? `: ${errorDescription}` : ""
      }`
    );
  }

  return oauthTokensFromResponse(data);
}

export async function getValidAccessToken(
  config: BridgeConfig
): Promise<string> {
  const tokens = await loadTokens(config.tokenFile);
  if (!tokens) {
    throw new Error(
      "No Kimi OAuth token found. Run: npm run kimi-oauth:login"
    );
  }

  const now = Date.now();
  if (now < tokens.expiresAt - ACCESS_TOKEN_LEEWAY_MS) {
    return tokens.accessToken;
  }

  if (tokens.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(config, tokens.refreshToken);
      await saveTokens(config.tokenFile, refreshed);
      return refreshed.accessToken;
    } catch (error) {
      await clearTokens(config.tokenFile);
      throw new Error(
        `Kimi token refresh failed: ${
          error instanceof Error ? error.message : String(error)
        }. Re-authenticate with: npm run kimi-oauth:login`
      );
    }
  }

  await clearTokens(config.tokenFile);
  throw new Error(
    "Kimi access token expired and no refresh token is available. Run: npm run kimi-oauth:login"
  );
}

export async function ensureTokenDirectory(config: BridgeConfig): Promise<void> {
  await mkdir(config.tokenDir, { recursive: true, mode: 0o700 });
}

function parseTokens(parsed: unknown): KimiOAuthTokens | null {
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const accessToken = typeof record.accessToken === "string" ? record.accessToken : "";
  const refreshToken = typeof record.refreshToken === "string" ? record.refreshToken : "";
  const expiresAt = typeof record.expiresAt === "number" ? record.expiresAt : 0;
  const tokenType = typeof record.tokenType === "string" ? record.tokenType : "Bearer";
  const scope = typeof record.scope === "string" ? record.scope : undefined;
  if (!accessToken) return null;
  return { accessToken, refreshToken, expiresAt, tokenType, scope };
}

function oauthTokensFromResponse(data: Record<string, unknown>): KimiOAuthTokens {
  const accessToken = String(data.access_token || "");
  const refreshToken = String(data.refresh_token || "");
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  const tokenType = String(data.token_type || "Bearer");
  const scope = typeof data.scope === "string" ? data.scope : undefined;

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

export function formatExpiry(tokens: KimiOAuthTokens): string {
  const date = new Date(tokens.expiresAt);
  return date.toISOString();
}

export { ACCESS_TOKEN_LEEWAY_MS, REFRESH_TOKEN_EXTRA_TTL_MS };
