import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAuth(locale: string = "no") {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/${locale}/innlogging`);
  }

  return { supabase, user };
}

export async function requireGuest(locale: string = "no") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  return { supabase };
}
