import { createServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Extract locale from referer or default to 'no'
  const referer = request.headers.get("referer") || "";
  const localeMatch = referer.match(/\/(no|en|th|zh)\//);
  const locale = localeMatch ? localeMatch[1] : "no";

  // Create response object first (for cookie handling)
  const redirectUrl = new URL(`/${locale}/dashboard`, request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 302 });

  if (code) {
    // Use the route handler client that handles PKCE cookies properly
    const supabase = createServerClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[Auth Callback] Exchange failed:", error.message);
      return NextResponse.redirect(
        new URL(`/${locale}/innlogging?error=exchange_failed`, request.url),
      );
    }
  } else {
    console.error("[Auth Callback] No code received");
    return NextResponse.redirect(
      new URL(`/${locale}/innlogging?error=no_code`, request.url),
    );
  }

  return response;
}
