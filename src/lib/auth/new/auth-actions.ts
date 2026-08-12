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
import { buildAuthRedirect } from "@/lib/auth/redirects";

// ============================================
// EMAIL/PASSWORD AUTH
// ============================================

export async function signInWithEmail(formData: FormData) {
  const supabase = await createServerClient();

  const email = (formData.get("email") as string)?.trim();
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

  // KLA-263: Nye brukere må fullføre onboarding før dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const onboardingDone = user?.user_metadata?.onboarding_completed === true;

  redirect(`/${locale}${onboardingDone ? "/dashboard" : "/onboarding"}`);
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createServerClient();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const username = (formData.get("username") as string)?.trim();
  const { getLocale } = await import("next-intl/server");
  const locale = await getLocale();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildAuthRedirect({ type: "oauth-callback", locale }),
      data: { username }, // Save username in auth metadata
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Save username to user_profiles hvis brukeren ble opprettet umiddelbart
  if (data?.user?.id && username) {
    const { error: profileError } = await supabase
      .from("user_profiles")
      // Insert krever id (NOT NULL); user_id er PK. Samme mønster som trading/sessions/route.ts
      .upsert({ id: data.user.id, user_id: data.user.id, username });

    if (profileError) {
      console.warn(
        "[signUpWithEmail] Username save failed:",
        profileError.message,
      );
    }
  }

  return {
    success: true,
    message: "Check your email for confirmation",
    // Med mailer_autoconfirm (e-postbekreftelse AV) returnerer Supabase en
    // aktiv sesjon med det samme — klienten kan da sende brukeren rett til
    // dashboard uten e-post-vegg.
    hasSession: data.session != null,
  };
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

  const email = (formData.get("email") as string)?.trim();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthRedirect({ type: "password-reset", locale }),
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
