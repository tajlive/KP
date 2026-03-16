'use client'

import { getSupabaseClient } from '@/lib/supabase/client'
import { getAppUrl } from './config'

function supabase() {
  return getSupabaseClient()
}

export async function signInWithGoogle() {
  const origin = getAppUrl()
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'no' : 'no'
  
  const { data, error } = await (supabase() as { auth: { signInWithOAuth: (o: unknown) => Promise<{ data: unknown; error: unknown }> } }).auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/${locale}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const { error } = await (supabase() as { auth: { signOut: () => Promise<{ error: unknown }> } }).auth.signOut()
  if (error) {
    throw error
  }
}

export async function getSession() {
  const { data: { user }, error } = await (supabase() as { auth: { getUser: () => Promise<{ data: { user: unknown }; error: unknown }> } }).auth.getUser()
  if (error) {
    throw error
  }
  // Return session for backward compat (access_token needed by callers)
  const { data: { session } } = await (supabase() as { auth: { getSession: () => Promise<{ data: { session: unknown } }> } }).auth.getSession()
  return session
}

export async function getUser() {
  const { data: { user }, error } = await (supabase() as { auth: { getUser: () => Promise<{ data: { user: unknown }; error: unknown }> } }).auth.getUser()
  if (error) {
    throw error
  }
  return user
}
