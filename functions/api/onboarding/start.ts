export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { createServerClient, createClient } from "@/lib/supabase/server";

async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
  const response = NextResponse.next();
  const supabaseAuth = createServerClient(request, response);
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
  }

  // Supabase REST API will be used directly via fetch
  const { error } = await supabase
    .from("user_profiles")
    .update({
      onboarding_step: 1,
      onboarding_started_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { 'Content-Type': 'application/json', ..., { status: 500 }.headers || {} }, status: , { status: 500 }.status || 200 });
  }

  return NextResponse.json({ success: true, step: 1 });
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
