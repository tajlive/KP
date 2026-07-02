import { existsSync } from "node:fs";
import { config as loadEnv } from "dotenv";

for (const path of [".env.local", ".env.production.local", ".env"]) {
  if (existsSync(path)) {
    loadEnv({ path, override: false });
  }
}

export type BridgeLogLevel = "debug" | "info" | "warn" | "error";

export interface BridgeConfig {
  port: number;
  bridgeApiKey: string;
  logLevel: BridgeLogLevel;
  kimi: KimiOAuthConfig;
  tokenDir: string;
  tokenFile: string;
}

export interface KimiOAuthConfig {
  clientId: string;
  clientSecret?: string;
  deviceEndpoint: string;
  tokenEndpoint: string;
  scope: string;
}

export function getConfig(): BridgeConfig {
  const port =
    Number(
      process.env.BRIDGE_PORT ||
        process.env.KIMI_OAUTH_BRIDGE_PORT ||
        process.env.PORT
    ) || 8123;
  const bridgeApiKey =
    process.env.BRIDGE_API_KEY?.trim() ||
    process.env.KIMI_OAUTH_BRIDGE_API_KEY?.trim() ||
    "";
  const logLevel = parseLogLevel(process.env.BRIDGE_LOG_LEVEL);
  const tokenDir =
    process.env.BRIDGE_TOKEN_DIR?.trim() ||
    process.env.KIMI_OAUTH_BRIDGE_TOKEN_DIR?.trim() ||
    defaultTokenDir();
  const tokenFile =
    process.env.BRIDGE_TOKEN_FILE?.trim() ||
    process.env.KIMI_OAUTH_BRIDGE_TOKEN_FILE?.trim() ||
    `${tokenDir}/tokens.json`;

  const clientId = process.env.KIMI_OAUTH_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.KIMI_OAUTH_CLIENT_SECRET?.trim() || undefined;
  const deviceEndpoint =
    process.env.KIMI_OAUTH_DEVICE_ENDPOINT?.trim() ||
    "https://platform.moonshot.cn/oauth/device";
  const tokenEndpoint =
    process.env.KIMI_OAUTH_TOKEN_ENDPOINT?.trim() ||
    "https://platform.moonshot.cn/oauth/token";
  const scope = process.env.KIMI_OAUTH_SCOPE?.trim() || "openid profile";

  return {
    port,
    bridgeApiKey,
    logLevel,
    tokenDir,
    tokenFile,
    kimi: {
      clientId,
      clientSecret,
      deviceEndpoint,
      tokenEndpoint,
      scope,
    },
  };
}

function parseLogLevel(value: string | undefined): BridgeLogLevel {
  switch (value?.trim().toLowerCase()) {
    case "debug":
      return "debug";
    case "warn":
      return "warn";
    case "error":
      return "error";
    case "info":
    default:
      return "info";
  }
}

function defaultTokenDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "/tmp";
  return `${home}/.kimi-oauth-bridge`;
}
