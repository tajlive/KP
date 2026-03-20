import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const start = performance.now();

  try {
    const authResponse = NextResponse.next();
    const supabaseAuth = createServerClient(request, authResponse);
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "Ikke autentisert", latencyMs: 0 },
        { status: 401 },
      );
    }

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { status: "error", message: "Krever admin-tilgang", latencyMs: 0 },
        { status: 403 },
      );
    }

    // Sjekk Resend API
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "RESEND_API_KEY mangler",
          latencyMs: Math.round(performance.now() - start),
        },
        { status: 500 },
      );
    }

    const response = await fetch("https://api.resend.com/api-keys", {
      headers: {
        Authorization: `Bearer ${resendKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: `Resend API feil: ${response.status}`,
          latencyMs: Math.round(performance.now() - start),
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    const apiKeys = data.data || [];

    return NextResponse.json({
      status: "ok",
      message: `Resend tilkoblet, ${apiKeys.length} API-nøkler funnet`,
      latencyMs: Math.round(performance.now() - start),
      details: {
        apiKeyCount: apiKeys.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Ukjent feil",
        latencyMs: Math.round(performance.now() - start),
      },
      { status: 500 },
    );
  }
}
