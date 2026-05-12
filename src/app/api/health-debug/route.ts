import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, { ok: boolean; ms: number; error?: string }> = {};

  // Test 1: createClient instantiation only
  const t1 = Date.now();
  try {
    const client = createClient();
    results.instantiate = { ok: true, ms: Date.now() - t1 };

    // Test 2: simple query
    const t2 = Date.now();
    const { error } = await client.from("user_profiles").select("id").limit(1);
    results.query = { ok: !error, ms: Date.now() - t2, error: error?.message };
  } catch (err) {
    results.instantiate = { ok: false, ms: Date.now() - t1, error: String(err) };
  }

  // Test 3: fetch Supabase REST directly
  const t3 = Date.now();
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(`${url}/rest/v1/user_profiles?select=id&limit=1`, {
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
    });
    results.rest = { ok: res.ok, ms: Date.now() - t3, error: res.statusText };
  } catch (err) {
    results.rest = { ok: false, ms: Date.now() - t3, error: String(err) };
  }

  return NextResponse.json({ results, env: process.env.VERCEL_REGION || "local" });
}
