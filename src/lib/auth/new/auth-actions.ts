/**
 * AUTH ACTIONS - Enkle, direkte Supabase kall
 * 
 * Ingen abstraksjoner, ingen kompleksitet.
 * Bare standard Supabase Auth API.
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

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

  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createServerClient();
  
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/no/callback`,
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
// OAUTH AUTH
// ============================================

export async function signInWithGoogle() {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/no/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
      scopes: "openid email profile", // Kun basic scopes
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithMicrosoft() {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/no/callback`,
      scopes: "email profile openid",
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

// ============================================
// PASSWORD RESET
// ============================================

export async function sendPasswordReset(formData: FormData) {
  const supabase = await createServerClient();
  
  const email = formData.get("email") as string;
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/no/update-password`,
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
