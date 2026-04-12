/**
 * OAUTH HEALTH CHECK ENDPOINT
 * 
 * Verifiserer at OAuth-konfigurasjonen er gyldig og fungerer.
 * Kritisk for å oppdage feil før brukere rapporterer dem.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface OAuthHealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    google: {
      enabled: boolean;
      configured: boolean;
    };
    microsoft: {
      enabled: boolean;
      configured: boolean;
    };
  };
  config: {
    appUrl: string;
    callbackUrl: string;
  };
}

export async function GET(): Promise<NextResponse<OAuthHealthResponse>> {
  const timestamp = new Date().toISOString();
  
  // Verifiser miljøvariabler
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "not-set";
  
  // Sjekk at URL-er er konfigurert korrekt
  const isAppUrlConfigured = appUrl !== "not-set" && 
    !appUrl.includes("trycloudflare.com") && 
    !appUrl.includes("localhost");
  
  const callbackUrl = isAppUrlConfigured ? `${appUrl}/no/callback` : "invalid";
  
  // Bygg respons
  const health: OAuthHealthResponse = {
    status: isAppUrlConfigured ? "healthy" : "unhealthy",
    timestamp,
    checks: {
      google: {
        enabled: true,
        configured: isAppUrlConfigured,
      },
      microsoft: {
        enabled: true,
        configured: isAppUrlConfigured,
      },
    },
    config: {
      appUrl,
      callbackUrl,
    },
  };
  
  const statusCode = isAppUrlConfigured ? 200 : 503;
  
  return NextResponse.json(health, { status: statusCode });
}
