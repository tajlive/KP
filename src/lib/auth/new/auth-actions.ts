/**
 * AUTH ACTIONS - Server-side email/password actions
 *
 * OAuth sign-in is handled client-side in @/lib/auth/googleAuth because
 * Next.js 15+ Server Actions cannot set the PKCE verifier cookie required
 * by Supabase OAuth. Keep OAuth flows out of this file.
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAppUrl, getCallbackUrl } from "@/lib/auth/config";

// ============================================
// EMAIL/PASSWORD AUTH
// ============================================

export async function signInWithEmail(formData: FormData) {
  const supabase = await createServerClient();
  
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const { getLocale } = await import("next-intl/server");
  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createServerClient();
  
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const { getLocale } = await import("next-intl/server");
  const locale = await getLocale();
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getCallbackUrl(locale),
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Check your email for confirmation" };
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ============================================
// PASSWORD RESET
// ============================================

export async function sendPasswordReset(formData: FormData) {
  const supabase = await createServerClient();
  const { getLocale } = await import("next-intl/server");
  const locale = await getLocale();
  
  const email = formData.get("email") as string;
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/${locale}/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Password reset sent to email" };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createServerClient();
  
  const password = formData.get("password") as string;
  
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const { getLocale } = await import("next-intl/server");
  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
}

// ============================================
// UTILS
// ============================================

export async function getCurrentUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
