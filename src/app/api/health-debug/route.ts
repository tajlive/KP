import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, { ok: boolean; ms: number; error?: string }> = {};

  // Test 1: service-role client query
  const t1 = Date.now();
  try {
    const client = createClient();
    const { error } = await client.from("user_profiles").select("id").limit(1);
    results.serviceRole = { ok: !error, ms: Date.now() - t1, error: error?.message };
  } catch (err) {
    results.serviceRole = { ok: false, ms: Date.now() - t1, error: String(err) };
  }

  // Test 2: direct REST fetch with service role key
  const t2 = Date.now();
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${url}/rest/v1/user_profiles?select=id&limit=1`, {
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    results.restService = { ok: res.ok, ms: Date.now() - t2, error: res.statusText };
  } catch (err) {
    results.restService = { ok: false, ms: Date.now() - t2, error: String(err) };
  }

  // Test 3: direct REST fetch with ANON key
  const t3 = Date.now();
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${url}/rest/v1/user_profiles?select=id&limit=1`, {
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    results.restAnon = { ok: res.ok, ms: Date.now() - t3, error: res.statusText };
  } catch (err) {
    results.restAnon = { ok: false, ms: Date.now() - t3, error: String(err) };
  }

  return NextResponse.json({ results, env: process.env.VERCEL_REGION || "local" });
}
