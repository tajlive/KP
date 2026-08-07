/**
 * TEST ONLY: Create auth session for E2E testing
 *
 * ⚠️  DENNE ENDEPUNKTEN SKAL KUN BRUKES I TESTER!
 * Den er beskyttet og krever test-secret.
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TEST_SECRET = process.env.TEST_SECRET || "test-secret-123";

export async function POST(request: NextRequest) {
  // Sikkerhetssjekk: kun tillat i test/utviklingsmiljø
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_API) {
    return NextResponse.json(
      { error: "Test API not available in production" },
      { status: 403 },
    );
  }

  // Sjekk test-secret
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== TEST_SECRET) {
    return NextResponse.json({ error: "Invalid test secret" }, { status: 401 });
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 },
    );
  }

  try {
    const supabase = createClient();

    // Prøv å logge inn med ekte credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Returner session info som testen kan bruke
    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
