import {
  pollAccessToken,
  storeKimiOAuthTokens,
  type KimiOAuthTokens,
} from "@/lib/ai/kimi-oauth";
import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RETRY_AFTER = 5;

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { deviceCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const deviceCode = body.deviceCode?.trim();
  if (!deviceCode) {
    return NextResponse.json(
      { error: "Missing deviceCode" },
      { status: 400 },
    );
  }

  try {
    const result = await pollAccessToken(deviceCode);

    if ("accessToken" in result) {
      const tokens = result as KimiOAuthTokens;
      await storeKimiOAuthTokens(tokens);
      return NextResponse.json({
        status: "success",
        expiresAt: tokens.expiresAt,
        model: "kimi-k2-6",
        reasoningEffort: "high",
      });
    }

    const pending = result as {
      status: string;
      error?: string;
    };

    switch (pending.status) {
      case "pending":
      case "slow_down":
        return NextResponse.json({
          status: "pending",
          retryAfter:
            pending.status === "slow_down"
              ? DEFAULT_RETRY_AFTER * 2
              : DEFAULT_RETRY_AFTER,
        });
      case "expired":
      case "expired_token":
        return NextResponse.json(
          { status: "expired", error: pending.error || "Device code expired" },
          { status: 410 },
        );
      case "denied":
      case "access_denied":
        return NextResponse.json(
          { status: "denied", error: pending.error || "Access denied" },
          { status: 403 },
        );
      default:
        return NextResponse.json(
          {
            status: pending.status,
            error: pending.error || "OAuth token request failed",
          },
          { status: 502 },
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token polling failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
