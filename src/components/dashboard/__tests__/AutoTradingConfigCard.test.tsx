/**
 * AutoTradingConfigCard - Unit Tests
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReturns = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockSelectChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: mockMaybeSingle,
  returns: mockReturns,
  update: mockUpdate,
  insert: mockInsert,
};
const mockFrom = vi.fn(() => mockSelectChain);
const mockGetUser = vi.fn();

vi.mock('@/lib/utils', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
  cn: (...args: unknown[]) => (args.filter(Boolean) as string[]).join(' '),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

function setupUser(id = 'user-abc') {
  // Workaround: write_file strips '' inside object literals
  const authResult = Object.fromEntries([['data', { user: { id } }]]);
  mockGetUser.mockResolvedValue(authResult);
}

type CfgShape = {
  is_enabled?: boolean | null;
  is_paper_trading?: boolean | null;
  trading_capital_nok?: number | null;
  risk_level?: string | null;
} | null;

function setupConfig(cfg: CfgShape) {
  const withError = Object.fromEntries([['data', cfg], ['error', null]]);
  mockMaybeSingle.mockResolvedValue(withError);
  mockReturns.mockResolvedValue(withError);
}

describe('AutoTradingConfigCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser();
    setupConfig(null);
    mockInsert.mockResolvedValue(Object.fromEntries([['data', null], ['error', null]]));
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue(Object.fromEntries([['data', null], ['error', null]])),
    });
  });

  it('kan importeres og er en React-komponent', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    expect(typeof AutoTradingConfigCard).toBe('function');
  });

  it('rendrer Auto-Trading overskrift', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { render(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(screen.getAllByText('Auto-Trading').length).toBeGreaterThan(0);
    });
  });

  it('rendrer Risikonivaa-label', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { render(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(screen.getByText('Risikoniv\u00e5')).toBeInTheDocument();
    });
  });

  it('viser Balansert som default naar DB returnerer null', async () => {
    setupConfig(null);
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { render(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(screen.getByText('Balansert')).toBeInTheDocument();
    });
  });

  it('viser Aggressiv naar risk_level=high', async () => {
    setupConfig({ is_enabled: false, is_paper_trading: true, trading_capital_nok: 10000, risk_level: 'high' });
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { render(<AutoTradingConfigCard />); });
    await waitFor(() => { expect(screen.getByText('Aggressiv')).toBeInTheDocument(); });
  });

  it('viser Konservativ naar risk_level=low', async () => {
    setupConfig({ is_enabled: false, is_paper_trading: false, trading_capital_nok: 5000, risk_level: 'low' });
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { render(<AutoTradingConfigCard />); });
    await waitFor(() => { expect(screen.getByText('Konservativ')).toBeInTheDocument(); });
  });

  it('viser live-advarsel naar is_paper_trading=false', async () => {
    setupConfig({ is_enabled: true, is_paper_trading: false, trading_capital_nok: 50000, risk_level: 'medium' });
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { render(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(screen.getByText(/Live trading bruker ekte penger/i)).toBeInTheDocument();
    });
  });

  it('Lagre-knapp er synlig', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { render(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(screen.getByText('Lagre innstillinger')).toBeInTheDocument();
    });
  });
});
