export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

/**
 * TEST ONLY: Set onboarding cookie to bypass checks
 * 
 * ⚠️  KUN FOR TESTING - FJERN I PRODUKSJON
 */

import { cookies } from "next/headers";

async function POSTHandler(request: Request, env: Env)() {
  // Sikkerhet: Kun i utvikling/test
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_API) {
    return new Response(JSON.stringify({ error: "Not allowed" }), { headers: { 'Content-Type': 'application/json', ..., { status: 403 }.headers || {} }, status: , { status: 403 }.status || 200 });
  }

  (await cookies()).set("kp_onboarding_status", "completed", {
    path: "/",
    maxAge: 3600 * 24 * 30, // 30 days
    sameSite: "lax",
  });

  return NextResponse.json({ 
    success: true, 
    message: "Onboarding cookie set. You can now access protected pages."
  });
}

// Allow GET for easy browser access
async function GETHandler(request: Request, env: Env)() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_API) {
    return new Response(JSON.stringify({ error: "Not allowed" }), { headers: { 'Content-Type': 'application/json', ..., { status: 403 }.headers || {} }, status: , { status: 403 }.status || 200 });
  }

  (await cookies()).set("kp_onboarding_status", "completed", {
    path: "/",
    maxAge: 3600 * 24 * 30,
    sameSite: "lax",
  });

  return NextResponse.json({ 
    success: true, 
    message: "✅ Onboarding cookie set! You can now access protected pages."
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
