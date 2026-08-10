"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { getAppUrl, getCallbackUrl, OAUTH_CONFIG } from "./config";
import {
  logAuthError,
  logAuthEvent,
  AuthErrorCode,
  AuthEvent,
} from "./sentry-auth";

function getLocaleFromWindow(): string {
  if (typeof window === "undefined") return "no";
  return window.location.pathname.split("/")[1] || "no";
}

async function performOAuthSignIn(
  provider: "google" | "azure" | "apple",
  config: (typeof OAUTH_CONFIG)["google"],
) {
  const origin = getAppUrl();
  const locale = getLocaleFromWindow();
  const { scopes, queryParams } = config;

  logAuthEvent(AuthEvent.LOGIN_STARTED, {
    provider,
    locale,
    method: "oauth",
  });

  try {
    const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getCallbackUrl(locale),
        scopes,
        queryParams,
      },
    });

    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("popup") || errorMessage.includes("blocked")) {
        logAuthError(AuthErrorCode.GOOGLE_OAUTH_POPUP_BLOCKED, error, { locale });
      } else {
        const code =
          provider === "google"
            ? AuthErrorCode.GOOGLE_OAUTH_FAILED
            : provider === "apple"
              ? AuthErrorCode.APPLE_OAUTH_FAILED
              : AuthErrorCode.MICROSOFT_OAUTH_FAILED;
        logAuthError(code, error, { locale, origin });
      }
      throw error;
    }

    if (data?.url) {
      window.location.href = data.url;
    }

    return data;
  } catch (catchError) {
    if (
      catchError instanceof Error &&
      !catchError.message.includes("popup") &&
      !catchError.message.includes("blocked")
    ) {
      const code =
        provider === "google"
          ? AuthErrorCode.GOOGLE_OAUTH_FAILED
          : provider === "apple"
            ? AuthErrorCode.APPLE_OAUTH_FAILED
            : AuthErrorCode.MICROSOFT_OAUTH_FAILED;
      logAuthError(code, catchError, {
        locale,
        origin,
        userAgent:
          typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      });
    }
    throw catchError;
  }
}

export async function signInWithGoogle() {
  return performOAuthSignIn("google", OAUTH_CONFIG.google);
}

export async function signInWithMicrosoft() {
  return performOAuthSignIn("azure", OAUTH_CONFIG.azure);
}

export async function signInWithApple() {
  return performOAuthSignIn("apple", OAUTH_CONFIG.apple);
}

export async function signOut() {
  logAuthEvent(AuthEvent.LOGOUT, {});

  const { error } = await getSupabaseClient().auth.signOut();
  if (error) {
    logAuthError(AuthErrorCode.UNKNOWN, error, { method: "signOut" });
    throw error;
  }
}

export async function getSession() {
  const supabase = getSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    logAuthError(AuthErrorCode.SESSION_INVALID, userError, {
      method: "getSession",
    });
    throw userError;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const { data: { user }, error } = await getSupabaseClient().auth.getUser();
  if (error) {
    logAuthError(AuthErrorCode.SESSION_INVALID, error, { method: "getUser" });
    throw error;
  }
  return user;
}
