/**
 * Google OAuth Integration - User Authentication and Profile Management
 */

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('Google OAuth not configured - Google tools will be disabled');
}

const GOOGLE_OAUTH = 'https://oauth2.googleapis.com';
const GOOGLE_API = 'https://www.googleapis.com';

// ==================== OAUTH FLOW ====================

export function getAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  
  if (state) {
    params.append('state', state);
  }
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(`${GOOGLE_OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google OAuth error: ${error.error_description || error.error}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  const response = await fetch(`${GOOGLE_OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh error: ${error.error_description || error.error}`);
  }

  return response.json();
}

// ==================== USER PROFILE ====================

export interface GoogleProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export async function getUserProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch(`${GOOGLE_API}/oauth2/v2/userinfo`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.statusText}`);
  }

  return response.json();
}

// Decode ID token (JWT) without verification (for client-side use)
export function decodeIdToken(idToken: string): GoogleProfile | null {
  try {
    const base64 = idToken.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ==================== ADMIN SDK (for domain-wide operations) ====================

const GOOGLE_ADMIN_API = 'https://admin.googleapis.com/admin/directory/v1';

export async function listDomainUsers(accessToken: string, domain: string): Promise<any[]> {
  const response = await fetch(
    `${GOOGLE_ADMIN_API}/users?domain=${domain}&maxResults=500`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Admin SDK error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.users || [];
}

// ==================== ANALYTICS ====================

export async function getGoogleAnalyticsData(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  metrics: string[] = ['activeUsers', 'sessions']
): Promise<any> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: metrics.map(m => ({ name: m })),
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Analytics error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

// ==================== TOKEN VALIDATION ====================

export async function validateToken(token: string): Promise<{
  valid: boolean;
  expired?: boolean;
  scope?: string;
}> {
  const response = await fetch(`${GOOGLE_OAUTH}/tokeninfo?access_token=${token}`);
  
  if (response.status === 400) {
    return { valid: false, expired: true };
  }
  
  if (!response.ok) {
    return { valid: false };
  }

  const data = await response.json();
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  if (data.exp && data.exp < now) {
    return { valid: false, expired: true };
  }

  return { valid: true, scope: data.scope };
}

// ==================== REVOKE TOKEN ====================

export async function revokeToken(token: string): Promise<void> {
  await fetch(`${GOOGLE_OAUTH}/revoke?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

// ==================== SUPABASE INTEGRATION HELPERS ====================

import { getSupabase } from './supabase.ts';

export async function linkGoogleAccount(userId: string, googleProfile: GoogleProfile): Promise<void> {
  const supabase = getSupabase();
  
  await supabase
    .from('profiles')
    .update({
      google_id: googleProfile.id,
      google_email: googleProfile.email,
      avatar_url: googleProfile.picture,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

export async function findUserByGoogleId(googleId: string): Promise<any | null> {
  const supabase = getSupabase();
  
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('google_id', googleId)
    .single();
  
  return data;
}

// ==================== SESSION MANAGEMENT ====================

export interface GoogleSession {
  user_id: string;
  google_id: string;
  email: string;
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  profile: GoogleProfile;
}

export async function createSession(
  tokens: { access_token: string; refresh_token?: string; expires_in: number },
  profile: GoogleProfile
): Promise<GoogleSession> {
  const supabase = getSupabase();
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  
  // Check if user exists
  let user = await findUserByGoogleId(profile.id);
  
  if (!user) {
    // Create new user
    const { data: newUser } = await supabase.auth.admin.createUser({
      email: profile.email,
      email_confirm: true,
      user_metadata: {
        google_id: profile.id,
        full_name: profile.name,
        avatar_url: profile.picture,
      },
    });
    
    user = newUser?.user;
  }
  
  // Store session
  await supabase.from('google_sessions').insert([{
    user_id: user.id,
    google_id: profile.id,
    email: profile.email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(expiresAt).toISOString(),
    profile,
  }]);
  
  return {
    user_id: user.id,
    google_id: profile.id,
    email: profile.email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    profile,
  };
}

export async function getValidSession(userId: string): Promise<GoogleSession | null> {
  const supabase = getSupabase();
  
  const { data } = await supabase
    .from('google_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!data) return null;
  
  // Check if token is expired
  if (new Date(data.expires_at).getTime() < Date.now()) {
    if (data.refresh_token) {
      // Refresh the token
      const newTokens = await refreshAccessToken(data.refresh_token);
      
      // Update session
      await supabase
        .from('google_sessions')
        .update({
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('user_id', userId);
      
      return {
        ...data,
        access_token: newTokens.access_token,
        expires_at: Date.now() + newTokens.expires_in * 1000,
      };
    }
    return null;
  }
  
  return data;
}
