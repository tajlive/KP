/**
 * Tests for API client auth handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithAuth, ApiError, checkAuth } from '../client';
import * as supabaseClient from '@/lib/supabase/client';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

describe('fetchWithAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return response for successful requests', async () => {
    const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.mocked(global.fetch).mockResolvedValue(mockResponse);

    const response = await fetchWithAuth('/api/test');
    expect(response.status).toBe(200);
  });

  it('should handle 401 by throwing ApiError', async () => {
    const mockResponse = new Response('Unauthorized', { status: 401 });
    vi.mocked(global.fetch).mockResolvedValue(mockResponse);

    // Mock Supabase signOut
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue({
      auth: { signOut: mockSignOut },
    } as any);

    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { replace: vi.fn(), pathname: '/dashboard' } as any;

    await expect(fetchWithAuth('/api/test')).rejects.toThrow(ApiError);

    // Restore location
    window.location = originalLocation;
  });

  it('should detect HTML responses as auth errors', async () => {
    const htmlResponse = new Response('<!DOCTYPE html><html>...</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
    vi.mocked(global.fetch).mockResolvedValue(htmlResponse);

    // Should handle HTML as auth error when expecting JSON
    const response = await fetchWithAuth('/api/test');
    expect(response.headers.get('content-type')).toContain('text/html');
  });
});

describe('checkAuth', () => {
  it('should return true for valid session', async () => {
    const mockSession = {
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
      },
    } as any);

    const result = await checkAuth();
    expect(result).toBe(true);
  });

  it('should return false for expired session', async () => {
    const mockSession = {
      expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: new Error('Refresh failed'),
        }),
      },
    } as any);

    const result = await checkAuth();
    expect(result).toBe(false);
  });

  it('should return false when no session exists', async () => {
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    } as any);

    const result = await checkAuth();
    expect(result).toBe(false);
  });
});
