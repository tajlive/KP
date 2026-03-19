import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAuth(locale: string = "no", nextPath?: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = `/${locale}/innlogging${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;
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
    redirect(`/${locale}/dashboard`);
  }

  return { supabase };
}
