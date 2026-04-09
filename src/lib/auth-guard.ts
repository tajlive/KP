import { createServerClient } from "@/lib/supabase/server";
import { localizedPathname } from "@/middleware/locale-path";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function requireAuth(locale: string = "no", nextPath?: string) {
  // DEBUG: Log cookies at entry
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const authCookies = allCookies.filter(c => 
    c.name.includes('sb-') || c.name.includes('supabase') || c.name.includes('auth')
  );
  
  console.info("🔥 REQUIRE AUTH - COOKIES:", {
    totalCookies: allCookies.length,
    authCookieNames: authCookies.map(c => c.name),
    hasAuthToken: authCookies.some(c => c.name.includes('auth-token')),
    locale,
    nextPath,
  });

  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.info("🔥 REQUIRE AUTH - RESULT:", {
    hasUser: !!user,
    userId: user?.id?.slice(0, 8),
    error: error?.message,
  });

  if (error || !user) {
    console.warn("🔥 REQUIRE AUTH - REDIRECTING TO LOGIN");
    const base = localizedPathname(locale, "/login");
    const loginUrl = `${base}${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;
    redirect(loginUrl);
  }

  return { supabase, user };
}

export async function requireGuest(locale: string = "no") {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(localizedPathname(locale, "/dashboard"));
  }

  return { supabase };
}
