/**
 * API client with automatic auth error handling
 * Clears expired sessions and redirects to login on 401/403
 */

import { getSupabaseClient } from '@/lib/supabase/client';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Clear all auth cookies and storage
 * This is needed when tokens expire to prevent infinite 401 loops
 */
function clearAuthState(): void {
  if (typeof window === 'undefined') return;

  console.log('[Auth] Clearing expired auth state...');

  // Clear all Supabase auth cookies
  const cookiesToClear = [
    'sb-vuxbjlykgmzskxbclquf-auth-token',
    'sb-vuxbjlykgmzskxbclquf-auth-token.0',
    'sb-vuxbjlykgmzskxbclquf-auth-token.1',
    'sb-auth-token',
    'supabase-auth-token',
  ];

  // Get all cookies and find auth-related ones
  const allCookies = document.cookie.split(';');
  allCookies.forEach(cookie => {
    const [name] = cookie.split('=');
    const trimmedName = name.trim();
    
    // Clear if it's an auth cookie
    if (trimmedName.includes('auth-token') || 
        trimmedName.includes('sb-') ||
        cookiesToClear.includes(trimmedName)) {
      // Clear with various domain/path combinations
      const domains = [undefined, '.klarpakke.no', 'klarpakke.no', '.www.klarpakke.no', 'www.klarpakke.no'];
      const paths = ['/', '/en', '/no'];
      
      domains.forEach(domain => {
        paths.forEach(path => {
          let cookieStr = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
          if (domain) cookieStr += `; domain=${domain}`;
          document.cookie = cookieStr;
        });
      });
    }
  });

  // Clear localStorage auth items
  const localStorageKeys = [
    'sb-vuxbjlykgmzskxbclquf-auth-token',
    'supabase.auth.token',
    'klarpakke-auth',
  ];
  
  localStorageKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore localStorage errors
    }
  });

  // Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch {
    // Ignore sessionStorage errors
  }

  console.log('[Auth] Auth state cleared');
}

/**
 * Handle auth failure by clearing state and redirecting
 */
async function handleAuthFailure(): Promise<void> {
  if (typeof window === 'undefined') return;

  console.log('[Auth] Handling auth failure...');

  // First, try to sign out from Supabase to clear server-side session
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut({ scope: 'local' });
    console.log('[Auth] Supabase signOut completed');
  } catch (err) {
    console.warn('[Auth] Supabase signOut failed:', err);
  }

  // Clear all cookies and storage
  clearAuthState();

  // Prevent redirect loops - check if we're already on login page
  const currentPath = window.location.pathname;
  if (currentPath.includes('/login') || currentPath.includes('/auth')) {
    console.log('[Auth] Already on login page, skipping redirect');
    return;
  }

  // Redirect to login with return URL
  const returnUrl = encodeURIComponent(currentPath + window.location.search);
  const loginUrl = `/login?next=${returnUrl}&expired=1`;
  
  console.log('[Auth] Redirecting to:', loginUrl);
  
  // Use replace to prevent back button from returning to broken state
  window.location.replace(loginUrl);
}

/**
 * Fetch with automatic auth handling
 * - Adds credentials for cookie-based auth
 * - Handles 401/403 by clearing session and redirecting to login
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle auth errors
  if (response.status === 401 || response.status === 403) {
    console.warn(`[API] ${response.status} Unauthorized:`, url);
    
    // Check if response is HTML (login page redirect)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/html')) {
      console.warn('[API] Received HTML instead of JSON - auth expired');
    }

    // Handle auth failure asynchronously
    await handleAuthFailure();
    
    throw new ApiError('Unauthorized', response.status, response);
  }

  return response;
}

/**
 * Safe JSON fetch that handles HTML responses
 * Some endpoints return HTML login page when auth expires
 */
export async function fetchJsonWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchWithAuth(url, options);
  
  // Check if we got HTML instead of JSON (auth redirect)
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('text/html')) {
    const text = await response.text();
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      console.error('[API] Received HTML page instead of JSON - auth expired');
      await handleAuthFailure();
      throw new ApiError('Session expired - please log in again', 401);
    }
  }

  try {
    return await response.json();
  } catch (err) {
    console.error('[API] Failed to parse JSON response:', err);
    throw new ApiError('Invalid JSON response', 500);
  }
}

/**
 * Check if user is authenticated
 * Uses Supabase client to verify session.
 * NOTE: refreshSession() is mutex-protected by refresh-guard to prevent storms.
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return false;
    }

    // NOTE: With @supabase/ssr, getSession() handles auto-refresh internally.
    // Explicit refreshSession() is a race-condition bomb — do NOT add it back.
    // If session exists here, it's valid (or was just refreshed by the client).
    return true;
  } catch (err) {
    console.error('[Auth] Error checking auth state:', err);
    return false;
  }
}

/**
 * Force logout - clears everything and redirects
 */
export async function forceLogout(redirectTo: string = '/login'): Promise<void> {
  console.log('[Auth] Force logout initiated');
  
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut({ scope: 'global' });
  } catch (err) {
    console.warn('[Auth] Supabase signOut during force logout:', err);
  }
  
  clearAuthState();
  
  if (typeof window !== 'undefined') {
    window.location.replace(redirectTo);
  }
}
