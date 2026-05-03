/**
 * Auth Utilities - Helper functions for authentication
 */

import { createClient } from "@/lib/utils";
import { getAppUrl, getCallbackUrl, OAUTH_CONFIG, SUPPORTED_PROVIDERS } from "./config";

// OAuth sign in with proper error handling
export async function signInWithOAuth(
  provider: keyof typeof SUPPORTED_PROVIDERS,
  locale: string = "no",
  redirectPath?: string,
) {
  const supabase = createClient();
  const providerKey = SUPPORTED_PROVIDERS[provider];
  if (providerKey === "vipps") {
    throw new Error(
      "Vipps uses custom flow via /api/auth/vipps-url; do not call signInWithOAuth for VIPPS.",
    );
  }
  const redirectTo = getCallbackUrl(locale);

  // FIX: Use ?next= to align with callback/route.ts which reads searchParams.get('next')
  const finalRedirectTo = redirectPath
    ? `${redirectTo}?next=${encodeURIComponent(redirectPath)}`
    : redirectTo;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: providerKey,
    options: {
      redirectTo: finalRedirectTo,
      ...OAUTH_CONFIG[providerKey],
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

// Get current user with profile
export async function getCurrentUser() {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // Get user profile
  interface UserProfile {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    tier: string;
    created_at: string;
    updated_at: string;
  }
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single<UserProfile>();

  if (profileError) {
    console.warn("Error fetching profile:", profileError);
  }

  return {
    user,
    profile: profile || null,
  };
}

// Validate session and refresh if needed
export async function validateSession() {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { valid: false, session: null };
  }

  // getUser() validates with the server, so if we got here the session is valid
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { valid: true, session };
}

// Parse OAuth error from URL
export function parseOAuthError(url: string): {
  error: string | null;
  description: string | null;
} {
  const urlObj = new URL(url);
  return {
    error: urlObj.searchParams.get("error"),
    description: urlObj.searchParams.get("error_description"),
  };
}

// Test auth configuration
export async function testAuthConfig(): Promise<{
  success: boolean;
  checks: Record<string, boolean | string>;
  errors: string[];
}> {
  const errors: string[] = [];
  const checks: Record<string, boolean | string> = {};

  checks.supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!checks.supabaseUrl)
    errors.push("NEXT_PUBLIC_SUPABASE_URL is not configured");

  checks.supabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!checks.supabaseKey)
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");

  checks.appUrl = getCallbackUrl("no"); // test config uses default locale

  try {
    const supabase = createClient();
    checks.clientCreation = true;

    const { error } = await supabase.auth.getUser();
    checks.sessionCheck = !error;
    if (error) errors.push(`Auth check failed: ${error.message}`);
  } catch (e) {
    checks.clientCreation = false;
    errors.push(`Failed to create Supabase client: ${e}`);
  }

  return { success: errors.length === 0, checks, errors };
}

// Log auth event for debugging
export function logAuthEvent(_event: string, _details?: Record<string, unknown>) {
  /* Intentionally empty — logging removed in production */
}

// ============================================
// EMAIL/PASSWORD AUTHENTICATION
// ============================================

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  confirmPassword?: string;
  referralCode?: string;
}

export async function signInWithEmail(
  credentials: SignInCredentials,
): Promise<{ user: unknown | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email.toLowerCase().trim(),
    password: credentials.password,
  });

  if (error) return { user: null, error };
  return { user: data.user, error: null };
}

export async function signUpWithEmail(credentials: SignUpCredentials): Promise<{
  user: unknown | null;
  error: Error | null;
  session: unknown | null;
}> {
  if (
    credentials.confirmPassword &&
    credentials.password !== credentials.confirmPassword
  ) {
    return {
      user: null,
      error: new Error("Passordene stemmer ikke overens"),
      session: null,
    };
  }
  if (credentials.password.length < 8) {
    return {
      user: null,
      error: new Error("Passordet må være minst 8 tegn"),
      session: null,
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email.toLowerCase().trim(),
    password: credentials.password,
    options: credentials.referralCode
      ? { data: { referral_code: credentials.referralCode } }
      : undefined,
  });

  if (error) return { user: null, error, session: null };
  return { user: data.user, error: null, session: data.session };
}

export async function signOut(): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(
  email: string,
  _locale: string = "no",
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.toLowerCase().trim(),
    { redirectTo: `${getAppUrl()}/${_locale}/update-password` },
  );
  return { error };
}

export async function updatePassword(
  newPassword: string,
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}

// ============================================
// MAGIC LINK AUTHENTICATION
// ============================================

export async function sendMagicLink(
  email: string,
  locale: string = "no",
): Promise<{ error: Error | null }> {
  const supabase = createClient();

  // FIX: Route magic links through /callback (PKCE exchange)
  // Previously bypassed callback: .replace('/callback', '/dashboard')
  // This caused magic links to land on /dashboard without a valid session
  const { error } = await supabase.auth.signInWithOtp({
    email: email.toLowerCase().trim(),
    options: {
      emailRedirectTo: getCallbackUrl(locale),
    },
  });

  return { error };
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Passordet må være minst 8 tegn");
  if (!/[A-Z]/.test(password))
    errors.push("Passordet må inneholde minst én stor bokstav");
  if (!/[a-z]/.test(password))
    errors.push("Passordet må inneholde minst én liten bokstav");
  if (!/[0-9]/.test(password))
    errors.push("Passordet må inneholde minst ett tall");
  return { valid: errors.length === 0, errors };
}

export function getErrorMessage(
  error: Error | null,
  locale: string = "no",
): string {
  if (!error) return "";

  const norwegianMessages: { [key: string]: string } = {
    "Invalid login credentials": "Feil e-post eller passord. Prøv igjen.",
    "Email not confirmed": "E-posten er ikke bekreftet. Sjekk innboksen din.",
    "User already registered":
      "Denne e-posten er allerede registrert. Logg inn i stedet.",
    "Password should be at least 6 characters":
      "Passordet må være minst 6 tegn",
    "Unable to validate email address: invalid format": "Ugyldig e-postadresse",
    "Request rate limit reached": "For mange forsøk. Vent litt og prøv igjen.",
    "User not found": "Ingen konto med denne e-postadressen.",
  };

  if (locale === "no") {
    return (
      norwegianMessages[error.message] ||
      error.message ||
      "En feil oppstod. Prøv igjen."
    );
  }
  return error.message || "An error occurred. Please try again.";
}
