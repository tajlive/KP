/**
 * API Client with Auth Error Handling
 * Automatically redirects to login on 401 errors
 * 2026-04-02: Enhanced with proper cookie clearing and Supabase signOut
 */

import { getSupabaseClient } from '@/lib/supabase/client';

const API_BASE = '';

interface ApiOptions extends RequestInit {
  redirectOnAuthError?: boolean;
}

/**
 * Clear all auth cookies completely
 * This prevents infinite redirect loops
 */
function clearAllAuthCookies(): void {
  if (typeof window === 'undefined') return;
  // Get all cookies
  const allCookies = document.cookie.split(';');
  
  allCookies.forEach(cookie => {
    const [name] = cookie.split('=');
    const trimmedName = name.trim();
    
    // Check if it's an auth-related cookie
    if (trimmedName.includes('auth') || 
        trimmedName.includes('sb-') ||
        trimmedName.includes('supabase') ||
        trimmedName.includes('token')) {
      
      // Try multiple domain/path combinations to ensure complete clearing
      const domains = [
        undefined, 
        '.klarpakke.no', 
        'klarpakke.no', 
        '.www.klarpakke.no', 
        'www.klarpakke.no',
        '',
      ];
      const paths = ['/', '/en', '/no', '/dashboard'];
      
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
    'sb-pskhryjzkobytnfwucrb-auth-token',
    'supabase.auth.token',
    'klarpakke-auth',
    'progress-storage',
  ];
  
  localStorageKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  });
}

/**
 * Handle auth failure comprehensively
 */
async function handleAuthFailure(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Prevent multiple simultaneous redirects
  if (window.location.pathname.includes('/login')) {
    return;
  }
  // Sign out from Supabase
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.warn('[Auth] Supabase signOut failed:', err);
  }

  // Clear all cookies
  clearAllAuthCookies();

  // Redirect to login
  const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
  const loginUrl = `/login?next=${returnUrl}&expired=1`;
  // Use replace to prevent back button issues
  window.location.replace(loginUrl);
}

/**
 * Fetch wrapper that handles auth errors
 */
export async function apiFetch(
  endpoint: string,
  options: ApiOptions = {}
): Promise<Response> {
  const { redirectOnAuthError = true, ...fetchOptions } = options;
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    credentials: 'include', // Always send cookies
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });
  
  // Handle 401 - redirect to login
  if ((response.status === 401 || response.status === 403) && redirectOnAuthError) {
    console.warn(`[API] ${response.status} Unauthorized:`, endpoint);
    
    // Check if we got HTML instead of JSON (redirect to login page)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/html')) {
      console.warn('[API] Received HTML response - session expired');
    }
    
    // Handle auth failure
    await handleAuthFailure();
    
    // Return a never-resolving promise to prevent further execution
    return new Promise(() => {});
  }
  
  return response;
}

/**
 * Safe JSON fetch that handles HTML responses
 */
export async function apiFetchJson<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, options);
  
  // Check content type
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('text/html')) {
    console.error('[API] Received HTML instead of JSON');
    await handleAuthFailure();
    throw new Error('Session expired - please log in again');
  }

  try {
    return await response.json();
  } catch (err) {
    console.error('[API] JSON parse error:', err);
    throw new Error('Invalid response format');
  }
}

/**
 * GET request helper
 */
export function apiGet(endpoint: string, options?: ApiOptions) {
  return apiFetch(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export function apiPost(endpoint: string, body: unknown, options?: ApiOptions) {
  return apiFetch(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Check if user is authenticated
 * Uses Supabase client for accurate session check
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return false;
    }

    // Check token expiration
    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      console.warn('[Auth] Token expired in checkAuth');
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Auth] Error checking auth:', err);
    return false;
  }
}

/**
 * Force logout - clears everything
 */
export async function forceLogout(redirectTo: string = '/login'): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut({ scope: 'global' });
  } catch (err) {
    console.warn('[Auth] Supabase signOut error:', err);
  }
  
  clearAllAuthCookies();
  
  if (typeof window !== 'undefined') {
    window.location.replace(redirectTo);
  }
}

// Re-export from api/client for consistency
export { fetchWithAuth, fetchJsonWithAuth } from './api/client';
