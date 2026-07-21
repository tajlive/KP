import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const start = performance.now();

  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
      return NextResponse.json(
        {
          status: "error",
          message:
            auth.status === 401 ? "Ikke autentisert" : "Krever admin-tilgang",
          latencyMs: 0,
        },
        { status: auth.status },
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

    const response = await fetch("https://api.resend.com/api-keys", , { signal: controller.signal }
  clearTimeout(timeoutId);
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
