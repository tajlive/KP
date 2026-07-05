import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  decryptImpersonationToken,
  type ImpersonationTokenPayload,
} from "./impersonation-crypto";

export interface ImpersonationGuardResult {
  isImpersonating: boolean;
  targetUserId?: string;
  readOnly: boolean;
}

const COOKIE_NAME = "__impersonate";

async function getImpersonationPayload(
  request: NextRequest,
): Promise<ImpersonationTokenPayload | null> {
  const secret = process.env.IMPERSONATION_SECRET;
  if (!secret) return null;

  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  return decryptImpersonationToken(cookie.value, secret);
}

async function verifyImpersonationSession(
  request: NextRequest,
  jti: string,
): Promise<boolean> {
  try {
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);
    const { data, error } = await (supabase.rpc as unknown as (
      name: "verify_impersonation_session",
      params: { p_jti: string },
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>)(
      "verify_impersonation_session",
      { p_jti: jti },
    );
    if (error) {
      console.warn("[impersonation-guard] verify RPC error:", error.message);
      return false;
    }
    return data === true;
  } catch (e) {
    console.warn("[impersonation-guard] verify RPC failed:", e);
    return false;
  }
}

export async function getImpersonationState(
  request: NextRequest,
): Promise<ImpersonationGuardResult> {
  const payload = await getImpersonationPayload(request);
  if (!payload) {
    return { isImpersonating: false, readOnly: false };
  }

  const active = await verifyImpersonationSession(request, payload.jti);
  if (!active) {
    return { isImpersonating: false, readOnly: false };
  }

  return {
    isImpersonating: true,
    targetUserId: payload.targetUserId,
    readOnly: true,
  };
}

export async function rejectIfImpersonating(
  request: NextRequest,
): Promise<NextResponse | null> {
  const state = await getImpersonationState(request);
  if (state.isImpersonating) {
    return NextResponse.json(
      {
        error: "Forbidden while impersonating",
        code: "IMPERSONATING_READ_ONLY",
      },
      { status: 403 },
    );
  }
  return null;
}
