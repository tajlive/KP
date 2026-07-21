import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret)
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.klarpakke.no";
  const res = await fetch(`${siteUrl}/api/cron/tick`, , { signal: controller.signal }
  clearTimeout(timeoutId);
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.json();
  return NextResponse.json({
    triggered: true,
    result: body,
    status: res.status,
  });
}
