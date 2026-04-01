import { createServerClient } from "@/lib/supabase/server";
import { localizedPathname } from "@/middleware/locale-path";
import { redirect } from "next/navigation";

export async function requireAuth(locale: string = "no", nextPath?: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
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
