/**
 * API Client with Auth Error Handling
 * Automatically redirects to login on 401 errors
 */

const API_BASE = '';

interface ApiOptions extends RequestInit {
  redirectOnAuthError?: boolean;
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
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });
  
  // Handle 401 - redirect to login
  if (response.status === 401 && redirectOnAuthError) {
    console.warn('[API] 401 Unauthorized, redirecting to login');
    
    // Clear potentially stale cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=');
      if (name.trim().startsWith('sb-')) {
        document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
    
    // Redirect to login with return URL
    const currentPath = window.location.pathname;
    window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
    
    // Return a never-resolving promise to prevent further execution
    return new Promise(() => {});
  }
  
  return response;
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
 * Returns true if authenticated, false if not
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/check', {
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}
