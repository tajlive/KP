import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const AUTH_TIMEOUT_MS = 8000; // 8s total — enough for Worker fetch to Supabase Auth

/**
 * Timeout wrapper — rejects with "timeout" if promise exceeds ms limit.
 * Used to protect against hung fetch() on Cloudflare Workers.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("auth-timeout")), ms),
    ),
  ]);
}

export async function requireAuth(locale = "no", nextPath?: string) {
  const supabase = await createServerClient();

  // Try getSession first — local cookie parse, no network.
  try {
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_TIMEOUT_MS / 2,
    );
    if (session?.user) {
      return { supabase, user: session.user };
    }
  } catch {
    // Session read failed or timed out — try network fallback
  }

  // Fallback to getUser() — validates token via network.
  // Wrap in timeout to avoid Worker hang.
  try {
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_TIMEOUT_MS / 2,
    );
    if (user) {
      return { supabase, user };
    }
  } catch {
    // Network auth failed or timed out — return null user
  }

  return { supabase, user: null };
}

export async function requireGuest(locale = "no") {
  const supabase = await createServerClient();

  try {
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_TIMEOUT_MS,
    );
    if (user) {
      redirect(`/${locale}/dashboard`);
    }
  } catch {
    // Auth unavailable — assume guest (safe default)
  }

  return { supabase };
}
