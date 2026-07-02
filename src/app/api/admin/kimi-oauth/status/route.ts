import { getValidKimiAccessToken } from "@/lib/ai/kimi-oauth";
import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { getRedisRest } from "@/lib/redis-client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KIMI_OAUTH_TOKENS_KEY = "kimi:oauth:tokens";
const KIMI_DEFAULT_MODEL = "kimi-k2-7-code";
const KIMI_DEFAULT_REASONING_EFFORT = "high";

interface StoredKimiTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

async function getStoredTokenExpiresAt(): Promise<number | undefined> {
  try {
    const redis = getRedisRest();
    if (!redis) return undefined;
    const tokens = await redis.get<StoredKimiTokens>(KIMI_OAUTH_TOKENS_KEY);
    return tokens?.expiresAt;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const staticKey = Boolean(
    process.env.MOONSHOT_API_KEY?.trim() || process.env.KIMI_API_KEY?.trim(),
  );
  const oauthClientConfigured = Boolean(
    process.env.KIMI_OAUTH_CLIENT_ID?.trim(),
  );

  try {
    const token = await getValidKimiAccessToken();
    if (token) {
      const expiresAt = await getStoredTokenExpiresAt();
      return NextResponse.json({
        configured: true,
        valid: true,
        expiresAt,
        model: KIMI_DEFAULT_MODEL,
        reasoningEffort: KIMI_DEFAULT_REASONING_EFFORT,
      });
    }

    const configured = staticKey || oauthClientConfigured;
    return NextResponse.json({
      configured,
      valid: staticKey,
      model: KIMI_DEFAULT_MODEL,
      reasoningEffort: staticKey ? KIMI_DEFAULT_REASONING_EFFORT : undefined,
    });
  } catch (error) {
    const configured = staticKey || oauthClientConfigured;
    return NextResponse.json({
      configured,
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to read OAuth token status",
      model: KIMI_DEFAULT_MODEL,
    });
  }
}
