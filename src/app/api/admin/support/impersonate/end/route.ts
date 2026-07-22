import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient } from "@/lib/supabase/server";
import { logAdminAudit } from "@/lib/admin/log-admin-audit";
import { decryptImpersonationToken } from "@/lib/admin/impersonation-crypto";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "__impersonate";

function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") ?? "";
  const isWWW = host.startsWith("www.");
  const rootDomain = isWWW ? host.slice(4) : host;
  return rootDomain.includes(":") ? undefined : `.${rootDomain}`;
}

function clearImpersonateCookie(
  response: NextResponse,
  request: NextRequest,
): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    domain: getCookieDomain(request),
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, code: "UNAUTHORIZED" },
      { status: auth.status },
    );
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  const response = NextResponse.json({ ok: true });

  if (!cookie?.value) {
    clearImpersonateCookie(response, request);
    return response;
  }

  const secret = process.env.IMPERSONATION_SECRET;
  if (!secret) {
    clearImpersonateCookie(response, request);
    console.warn("[impersonate/end] IMPERSONATION_SECRET missing; cookie cleared but DB not updated");
    return response;
  }

  const payload = await decryptImpersonationToken(cookie.value, secret);
  if (!payload) {
    clearImpersonateCookie(response, request);
    console.warn("[impersonate/end] Could not decrypt impersonation cookie; cookie cleared");
    return response;
  }

  const supabase = createClient();

  // TODO: Opprett support_impersonation_sessions-tabell i DB — mangler i supabase-typene
  const sb = supabase as unknown as {
    from: (table: string) => {
      update: (vals: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{
          error: { message: string } | null;
          data: unknown;
        }>;
      };
    };
  };
  const { error: updateError } = await sb
    .from("support_impersonation_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("token_jti", payload.jti);

  if (updateError) {
    console.error("[impersonate/end] session update error:", updateError.message);
  }

  await logAdminAudit(supabase, {
    admin_user_id: auth.userId,
    action: "impersonation.ended",
    target_user_id: payload.targetUserId,
    payload: { jti: payload.jti },
  });

  clearImpersonateCookie(response, request);
  return response;
}
