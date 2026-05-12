export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";

async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: "Missing endpoint" },
        { status: 400 }
      );
    }

    const response = NextResponse.next();
    const supabase = createServerClient(request, response);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
    }

    const admin = createClient();
    const { error } = await admin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting push subscription:", error);
      return NextResponse.json(
        { error: "Failed to delete subscription" },
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true });
  } catch (err), { headers: { 'Content-Type': 'application/json' } }) {
    console.error("Unsubscribe error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
