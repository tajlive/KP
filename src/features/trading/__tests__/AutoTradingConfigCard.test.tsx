/**
 * AutoTradingConfigCard - Unit Tests
 * KLA-auth: komponenten henter konfig via /api/user/auto-trading-config
 * (server leser httpOnly auth-cookie) — testen mocker fetch.
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';

// ResizeObserver mock (krevet av Radix UI Slider)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// fetch-mock for /api/user/auto-trading-config
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

type CfgShape = {
  is_enabled?: boolean | null;
  is_paper_trading?: boolean | null;
  trading_capital_nok?: number | null;
  risk_level?: string | null;
} | null;

const messages = {
  trading: {
    paperMode: "Lekepenger",
    liveMode: "Live",
    autoTradingConfig: {
      title: "Auto-Trading",
      loading: "Laster...",
      subtitle: "La AI handle på dine vegne",
      toggleLabel: "Aktiver auto-trading",
      enabledDesc: "AI handler automatisk",
      disabledDesc: "AI er deaktivert",
      modeLabel: "Handelsmodus",
      paperDesc: "Øv uten risiko",
      liveDesc: "Live trading bruker ekte penger",
      riskLabel: "Risikonivå",
      riskLevels: {
        low: { label: "Konservativ", description: "Lav risiko" },
        medium: { label: "Balansert", description: "Middels risiko" },
        high: { label: "Aggressiv", description: "Høy risiko" },
      },
      maxTradeSize: "Maks handelsstørrelse",
      minAmount: "1 000 NOK",
      maxAmount: "100 000 NOK",
      save: "Lagre innstillinger",
      saving: "Lagrer...",
      saveSuccess: "Lagret",
      saveError: "Feil ved lagring",
      loginRequired: "Du må logge inn",
    },
  },
};

const renderWithI18n = (component: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
};

function setupConfig(cfg: CfgShape) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ok: true, config: cfg }),
  } as Response);
}

describe('AutoTradingConfigCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConfig(null);
  });

  it('kan importeres og er en React-komponent', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    expect(typeof AutoTradingConfigCard).toBe('function');
  });

  it('rendrer Auto-Trading overskrift', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { renderWithI18n(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(screen.getAllByText('Auto-Trading').length).toBeGreaterThan(0);
    });
  });

  it('rendrer Risikonivaa-label', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { renderWithI18n(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(screen.getByText('Risikoniv\u00e5')).toBeInTheDocument();
    });
  });

  it('henter konfig fra /api/user/auto-trading-config med same-origin credentials', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { renderWithI18n(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/user/auto-trading-config',
        expect.objectContaining({ credentials: 'same-origin' }),
      );
    });
  });

  it('viser Balansert som default naar API returnerer null', async () => {
    setupConfig(null);
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { renderWithI18n(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(screen.getByText('Balansert')).toBeInTheDocument();
    });
  });

  it('viser Aggressiv naar risk_level=high', async () => {
    setupConfig({ is_enabled: false, is_paper_trading: true, trading_capital_nok: 10000, risk_level: 'high' });
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { renderWithI18n(<AutoTradingConfigCard />); });
    await waitFor(() => { expect(screen.getByText('Aggressiv')).toBeInTheDocument(); });
  });

  it('viser Konservativ naar risk_level=low', async () => {
    setupConfig({ is_enabled: false, is_paper_trading: false, trading_capital_nok: 5000, risk_level: 'low' });
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { renderWithI18n(<AutoTradingConfigCard />); });
    await waitFor(() => { expect(screen.getByText('Konservativ')).toBeInTheDocument(); });
  });

  it('viser live-advarsel naar is_paper_trading=false', async () => {
    setupConfig({ is_enabled: true, is_paper_trading: false, trading_capital_nok: 50000, risk_level: 'medium' });
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { renderWithI18n(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(screen.getByText(/Live trading bruker ekte penger/i)).toBeInTheDocument();
    });
  });

  it('Lagre-knapp er synlig', async () => {
    const { AutoTradingConfigCard } = await import('../AutoTradingConfigCard');
    await act(async () => { renderWithI18n(<AutoTradingConfigCard />); });
    await waitFor(() => {
      expect(screen.getByText('Lagre innstillinger')).toBeInTheDocument();
    });
  });
});
