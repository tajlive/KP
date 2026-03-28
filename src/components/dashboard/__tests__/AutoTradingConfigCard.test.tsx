/**
 * AutoTradingConfigCard — Unit Tests
 * Dekker: loading, fetch, risk_level, lagring, live-advarsel
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ────────────────────────────────────────────────────────────
const mockReturns = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockEqConfig = vi.fn();
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

// ─── Sonner mock ──────────────────────────────────────────────────────────────
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setupUser(id = 'user-abc') {
  mockGetUser.mockResolvedValue({  { user: { id } } });
}

function setupConfig(
   {
    is_enabled?: boolean | null;
    is_paper_trading?: boolean | null;
    trading_capital_nok?: number | null;
    risk_level?: string | null;
  } | null
) {
  mockReturns.mockResolvedValue({ data, error: null });
  mockMaybeSingle.mockReturnValue({ returns: mockReturns });
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('AutoTradingConfigCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Standard: bruker innlogget, ingen config i DB
    setupUser();
    setupConfig(null);
    // Eksisterende konfig-sjekk (for save-path)
    mockMaybeSingle.mockResolvedValue({  null, error: null });
    mockInsert.mockResolvedValue({  null, error: null });
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({  null, error: null }),
    });
  });

  it('kan importeres og er en React-komponent', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    expect(typeof AutoTradingConfigCard).toBe('function');
  });

  it('rendrer Auto-Trading tittel etter data er lastet (tom DB)', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => {
      render(<AutoTradingConfigCard />);
    });
    await waitFor(() => {
      expect(screen.getAllByText('Auto-Trading').length).toBeGreaterThan(0);
    });
  });

  it('rendrer Risikonivå-label', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => {
      render(<AutoTradingConfigCard />);
    });
    await waitFor(() => {
      expect(screen.getByText('Risikonivå')).toBeInTheDocument();
    });
  });

  it('viser Balansert som default risikonivå når DB returnerer null', async () => {
    setupConfig(null); // ingen config i DB → default medium
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => {
      render(<AutoTradingConfigCard />);
    });
    await waitFor(() => {
      expect(screen.getByText('Balansert')).toBeInTheDocument();
    });
  });

  it('viser Aggressiv når DB returnerer risk_level=high', async () => {
    setupConfig({
      is_enabled: false,
      is_paper_trading: true,
      trading_capital_nok: 10000,
      risk_level: 'high',
    });
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => {
      render(<AutoTradingConfigCard />);
    });
    await waitFor(() => {
      expect(screen.getByText('Aggressiv')).toBeInTheDocument();
    });
  });

  it('viser Konservativ når DB returnerer risk_level=low', async () => {
    setupConfig({
      is_enabled: false,
      is_paper_trading: false,
      trading_capital_nok: 5000,
      risk_level: 'low',
    });
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => {
      render(<AutoTradingConfigCard />);
    });
    await waitFor(() => {
      expect(screen.getByText('Konservativ')).toBeInTheDocument();
    });
  });

  it('viser live-advarsel når mode er live', async () => {
    setupConfig({
      is_enabled: true,
      is_paper_trading: false, // live
      trading_capital_nok: 50000,
      risk_level: 'medium',
    });
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => {
      render(<AutoTradingConfigCard />);
    });
    await waitFor(() => {
      expect(
        screen.getByText(/Live trading bruker ekte penger/i)
      ).toBeInTheDocument();
    });
  });

  it('Lagre-knapp er synlig', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => {
      render(<AutoTradingConfigCard />);
    });
    await waitFor(() => {
      expect(screen.getByText('Lagre innstillinger')).toBeInTheDocument();
    });
  });
});
