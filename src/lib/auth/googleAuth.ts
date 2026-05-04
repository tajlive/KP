'use client'

import { getSupabaseClient } from '@/lib/supabase/client'
import { getAppUrl, getCallbackUrl } from './config'
import { logAuthError, logAuthEvent, AuthErrorCode, AuthEvent } from './sentry-auth'

function supabase() {
  return getSupabaseClient()
}

async function performOAuthSignIn(
  provider: 'google' | 'azure',
  scopes: string,
  queryParams?: Record<string, string>
) {
  const _origin = getAppUrl().trim().replace(/[\r\n]/g, '')
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'no' : 'no'

  logAuthEvent(AuthEvent.LOGIN_STARTED, {
    provider,
    locale,
    method: 'oauth',
  })

  try {
    const { data, error } = await (supabase() as {
      auth: {
        signInWithOAuth: (o: unknown) => Promise<{ data: { url: string }; error: Error | null }>
      }
    }).auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getCallbackUrl(locale),
        queryParams,
        scopes,
      },
    })

    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('popup') || errorMessage.includes('blocked')) {
        logAuthError(AuthErrorCode.GOOGLE_OAUTH_POPUP_BLOCKED, error, { locale })
      } else {
        logAuthError(AuthErrorCode.GOOGLE_OAUTH_FAILED, error, { locale, origin: _origin })
      }
      throw error
    }

    if (data?.url) {
      window.location.href = data.url
    }

    return data
  } catch (catchError) {
    if (
      catchError instanceof Error &&
      !catchError.message.includes('popup') &&
      !catchError.message.includes('blocked')
    ) {
      logAuthError(AuthErrorCode.GOOGLE_OAUTH_FAILED, catchError, {
        locale,
        origin: _origin,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      })
    }
    throw catchError
  }
}

export async function signInWithGoogle() {
  return performOAuthSignIn('google', 'openid email profile', {
    access_type: 'offline',
    prompt: 'consent',
  })
}

export async function signInWithMicrosoft() {
  return performOAuthSignIn('azure', 'email profile openid')
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
