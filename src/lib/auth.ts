/**
 * Authentication utilities for Klarpakke
 * Works with Cloudflare Access JWT tokens
 */

export interface CloudflareAccessUser {
  email: string;
  sub: string; // User ID
  aud: string[]; // Audience
  iss: string; // Issuer
  iat: number; // Issued at
  exp: number; // Expiration
  groups?: string[]; // User groups (if configured)
  country?: string; // User country
}

/**
 * Parse Cloudflare Access JWT from headers
 * Server-side only - use in API routes or Server Components
 */
export function parseAccessJWT(headers: Headers): CloudflareAccessUser | null {
  try {
    const token = headers.get('Cf-Access-Jwt-Assertion');
    
    if (!token) {
      return null;
    }

    // Decode JWT payload (already verified by middleware)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload as CloudflareAccessUser;
  } catch (error) {
    console.error('Failed to parse Access JWT:', error);
    return null;
  }
}

/**
 * Get current user from request headers
 * Server-side only
 */
export function getCurrentUser(request: Request): CloudflareAccessUser | null {
  return parseAccessJWT(request.headers);
}

/**
 * Check if user belongs to a specific group
 * Useful for role-based access control (RBAC)
 */
export function userHasGroup(user: CloudflareAccessUser | null, group: string): boolean {
  if (!user || !user.groups) {
    return false;
  }
  return user.groups.includes(group);
}

/**
 * Check if user has premium access
 */
export function isPremiumUser(user: CloudflareAccessUser | null): boolean {
  return userHasGroup(user, 'premium') || userHasGroup(user, 'vip');
}

/**
 * Get user display name
 * Falls back to email if no name available
 */
export function getUserDisplayName(user: CloudflareAccessUser | null): string {
  if (!user) {
    return 'Anonymous';
  }
  
  // Extract name from email (before @)
  const emailName = user.email.split('@')[0];
  return emailName.charAt(0).toUpperCase() + emailName.slice(1);
}

/**
 * Check if JWT is expired
 */
export function isJWTExpired(user: CloudflareAccessUser | null): boolean {
  if (!user || !user.exp) {
    return true;
  }
  
  return user.exp < Date.now() / 1000;
}
