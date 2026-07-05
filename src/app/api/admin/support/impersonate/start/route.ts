import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient } from "@/lib/supabase/server";
import { logAdminAudit } from "@/lib/admin/log-admin-audit";
import {
  encryptImpersonationToken,
  type ImpersonationTokenPayload,
} from "@/lib/admin/impersonation-crypto";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  reason: z.string().min(1).max(500),
  durationMin: z.number().int().min(5).max(60).default(15),
});

function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") ?? "";
  const isWWW = host.startsWith("www.");
  const rootDomain = isWWW ? host.slice(4) : host;
  return rootDomain.includes(":") ? undefined : `.${rootDomain}`;
}

function getImpersonationSecret(): string {
  const secret = process.env.IMPERSONATION_SECRET;
  if (!secret) {
    throw new Error("IMPERSONATION_SECRET is not configured");
  }
  return secret;
}

async function passwordGrantLogin(
  email: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Password grant failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!data.access_token || !data.refresh_token) {
    throw new Error("Password grant response missing tokens");
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, code: "UNAUTHORIZED" },
      { status: auth.status },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body",
        code: "INVALID_BODY",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { email, password, reason, durationMin } = parsed.data;

  // V1: only allow impersonation of test accounts (e.g. Viking_NO).
  const isTestAccount = email.toLowerCase().endsWith("@klarpakke.test");
  if (!isTestAccount) {
    return NextResponse.json(
      {
        ok: false,
        error: "V1 impersonation is restricted to test accounts",
        code: "TEST_ACCOUNTS_ONLY",
      },
      { status: 403 },
    );
  }

  const supabase = createClient();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    console.error("[impersonate/start] profile lookup error:", profileError.message);
    return NextResponse.json(
      { ok: false, error: "Failed to look up user", code: "PROFILE_LOOKUP_FAILED" },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "User not found", code: "USER_NOT_FOUND" },
      { status: 404 },
    );
  }

  let tokens: { access_token: string; refresh_token: string };
  try {
    tokens = await passwordGrantLogin(email, password);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Password grant failed";
    console.error("[impersonate/start] password grant error:", message);
    return NextResponse.json(
      { ok: false, error: "Invalid password or login failed", code: "LOGIN_FAILED" },
      { status: 401 },
    );
  }

  const jti = randomUUID();
  const now = Date.now();
  const expiresAt = new Date(now + durationMin * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from("support_impersonation_sessions")
    .insert({
      token_jti: jti,
      admin_user_id: auth.userId,
      target_user_id: profile.id,
      reason,
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error("[impersonate/start] session insert error:", insertError.message);
    return NextResponse.json(
      { ok: false, error: "Failed to create session", code: "SESSION_INSERT_FAILED" },
      { status: 500 },
    );
  }

  const payload: ImpersonationTokenPayload = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    jti,
    targetUserId: profile.id,
    expiresAt,
  };

  let encrypted: string;
  try {
    encrypted = await encryptImpersonationToken(payload, getImpersonationSecret());
  } catch (e) {
    const message = e instanceof Error ? e.message : "Encryption failed";
    console.error("[impersonate/start] encryption error:", message);
    return NextResponse.json(
      { ok: false, error: "Failed to encrypt session", code: "ENCRYPTION_FAILED" },
      { status: 500 },
    );
  }

  await logAdminAudit(supabase, {
    admin_user_id: auth.userId,
    action: "impersonation.started",
    target_user_id: profile.id,
    payload: { reason, duration_min: durationMin, expires_at: expiresAt },
  });

  const response = NextResponse.json({ ok: true, expiresAt });
  response.cookies.set("__impersonate", encrypted, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    domain: getCookieDomain(request),
    path: "/",
    maxAge: durationMin * 60,
  });

  return response;
}
