import { createServerClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabaseAuth = createServerClient(request, response);
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single();

  const ADMIN_EMAILS = ["tomarnejensen@gmail.com", "admin@klarpakke.no"];
  if (!ADMIN_EMAILS.includes(user.email ?? "") && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.klarpakke.no";
  const res = await fetch(`${siteUrl}/api/cron/tick`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.json();
  return NextResponse.json({ triggered: true, result: body, status: res.status });
}
