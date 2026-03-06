/**
 * TEST ONLY: Set onboarding cookie to bypass checks
 * 
 * ⚠️  KUN FOR TESTING - FJERN I PRODUKSJON
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  // Sikkerhet: Kun i utvikling/test
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_API) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
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
export async function GET() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_API) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
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
