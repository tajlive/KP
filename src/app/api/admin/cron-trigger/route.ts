import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const authClient: unknown = (await createClient()) as unknown;
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await authClient
    .from("user_profiles").select("role").eq("id", user.id).single() as unknown;

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
