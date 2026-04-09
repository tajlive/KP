'use client'

import { getSupabaseClient } from '@/lib/supabase/client'
import { getAppUrl } from './config'
import { logAuthError, logAuthEvent, AuthErrorCode, AuthEvent } from './sentry-auth'

function supabase() {
  return getSupabaseClient()
}

export async function signInWithGoogle() {
  const origin = getAppUrl()
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'no' : 'no'
  
  logAuthEvent(AuthEvent.LOGIN_STARTED, { 
    provider: 'google', 
    locale,
    method: 'oauth',
  });
  
  try {
    const { data, error } = await (supabase() as { auth: { signInWithOAuth: (o: unknown) => Promise<{ data: unknown; error: unknown }> } }).auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/${locale}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        // Eksplisitt bare basic profile - ingen sensitive scopes
        scopes: 'openid email profile',
      },
    })

    if (error) {
      // Check for specific error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('popup') || errorMessage.includes('blocked')) {
        logAuthError(AuthErrorCode.GOOGLE_OAUTH_POPUP_BLOCKED, error, { locale });
      } else {
        logAuthError(AuthErrorCode.GOOGLE_OAUTH_FAILED, error, { locale, origin });
      }
      
      throw error;
    }

    return data;
    
  } catch (catchError) {
    // Log if not already logged above
    if (catchError instanceof Error && 
        !catchError.message.includes('popup') && 
        !catchError.message.includes('blocked')) {
      logAuthError(AuthErrorCode.GOOGLE_OAUTH_FAILED, catchError, { 
        locale, 
        origin,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      });
    }
    throw catchError;
  }
}

export async function signOut() {
  logAuthEvent(AuthEvent.LOGOUT, {});
  
  const { error } = await (supabase() as { auth: { signOut: () => Promise<{ error: unknown }> } }).auth.signOut()
  if (error) {
    logAuthError(AuthErrorCode.UNKNOWN, error, { method: 'signOut' });
    throw error;
  }
}

export async function getSession() {
  const { data: { user }, error } = await (supabase() as { auth: { getUser: () => Promise<{ data: { user: unknown }; error: unknown }> } }).auth.getUser()
  if (error) {
    logAuthError(AuthErrorCode.SESSION_INVALID, error, { method: 'getSession' });
    throw error;
  }
  // Return session for backward compat (access_token needed by callers)
  const { data: { session } } = await (supabase() as { auth: { getSession: () => Promise<{ data: { session: unknown } }> } }).auth.getSession()
  return session
}

export async function getUser() {
  const { data: { user }, error } = await (supabase() as { auth: { getUser: () => Promise<{ data: { user: unknown }; error: unknown }> } }).auth.getUser()
  if (error) {
    logAuthError(AuthErrorCode.SESSION_INVALID, error, { method: 'getUser' });
    throw error
  }
  return user
}
