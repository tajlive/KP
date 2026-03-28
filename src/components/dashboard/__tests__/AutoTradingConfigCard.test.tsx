import { describe, it, expect, vi } from 'vitest';

// Mock Supabase createClient
vi.mock('@/lib/utils', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      returns: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AutoTradingConfigCard', () => {
  it('komponenten kan importeres', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    expect(AutoTradingConfigCard).toBeDefined();
    expect(typeof AutoTradingConfigCard).toBe('function');
  });
});
