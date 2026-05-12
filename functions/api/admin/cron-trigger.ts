export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";

export const dynamic = "force-dynamic";

async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), { headers: { 'Content-Type': 'application/json', ..., { status: auth.status }.headers || {} }, status: , { status: auth.status }.status || 200 });
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret)
    return new Response(JSON.stringify({ error: "CRON_SECRET not set" }), { headers: { 'Content-Type': 'application/json', ..., { status: 500 }.headers || {} }, status: , { status: 500 }.status || 200 });

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.klarpakke.no";
  const res = await fetch(`${siteUrl}/api/cron/tick`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.json();
  return NextResponse.json({
    triggered: true,
    result: body,
    status: res.status,
  });
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'POST') {
      return POSTHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
