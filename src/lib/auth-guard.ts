import { createServerClient } from "@/lib/supabase/server";
import { localizedPathname } from "@/middleware/locale-path";
import { redirect } from "next/navigation";

export async function requireAuth(locale: string = "no", nextPath?: string) {
  const supabase = await createServerClient();

  // Use getSession first (reads cookies locally, no network call) to avoid
  // race conditions where middleware sees auth but server component doesn't.
  const { data: { session } } = await supabase.auth.getSession();
  let user = session?.user ?? null;

  // Fallback to getUser() if session is missing but cookies exist
  if (!user) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser ?? null;
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
