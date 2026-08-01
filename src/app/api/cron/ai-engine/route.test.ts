import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Regresjonstest: ai-engine må ALDRI la observability-feil (ai_decision_log)
// blokkere de kritiske trading_signals-insertene.
// Bug 2026-08-01: inserten brukte kolonner som ikke finnes (symbol,
// decision_type, sentiment_score, analysis_data, decision_reason,
// executed_at) + SYSTEM_SIGNAL_USER_ID fantes ikke i auth.users → inserten
// feilet ALLTID → `continue` → ensemble-signaler nådde aldri tick.
// ============================================================================

// Mock supabase-klient og ensemble
const tradingSignalsInserts: unknown[] = [];
const decisionLogInserts: unknown[] = [];
const featureStoreInserts: unknown[] = [];

const dbMock = {
  from: vi.fn((table: string) => {
    const capture = (rows: unknown[]) => ({
      insert: vi.fn(async (row: unknown) => {
        rows.push(row);
        return { error: null };
      }),
    });
    if (table === 'trading_signals') return capture(tradingSignalsInserts);
    if (table === 'ai_decision_log') {
      // Simuler skjema-feil: kolonnen finnes ikke lenger (som før fiksen ville
      // feilet alltid) — men nå må det ikke blokkere trading_signals
      return {
        insert: vi.fn(async (row: unknown) => {
          decisionLogInserts.push(row);
          return { error: { message: 'Could not find the X column in the schema cache' } };
        }),
      };
    }
    if (table === 'ai_feature_store') return capture(featureStoreInserts);
    throw new Error(`Unexpected table: ${table}`);
  }),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => dbMock),
}));

vi.mock('@/lib/ai/ensemble-v2', () => ({
  runEnsembleForSymbol: vi.fn(async () => ({
    action: 'buy',
    confidence: 72,
    reasoning: 'Test-signal',
    runId: 'test-run-1',
    agentResults: [
      {
        agent: { id: 'agent-trend' },
        adjustedWeight: 0.6,
        signal: { action: 'buy', confidence: 70, reasoning: 'trend', meta: {} },
      },
    ],
  })),
}));

vi.mock('@/lib/cron/cron-helpers', () => ({
  captureCronError: vi.fn(),
  captureCronSuccess: vi.fn(),
}));

vi.mock('@/lib/auth/cron', () => ({
  validateCronSecret: vi.fn(() => true),
}));

vi.mock('@/lib/trading/canonical/market-data/binance-proxy-provider', () => ({
  fetchKlinesViaProxy: vi.fn(async () => {
    // Stigende priser (uptrend) + volum > 5M USDT 24h → volum-gaten passeres
    // og 4h-trend er bullish slik at MTF-filteret ikke blokkerer buy.
    const candles: [number, string, string, string, string, string][] = [];
    for (let i = 0; i < 55; i++) {
      const close = 60000 + i * 10; // 60000 → 60540, opptrend
      candles.push([i, String(close - 100), String(close + 100), String(close - 200), String(close), '3000000']);
    }
    return candles;
  }),
}));

import { GET } from './route';

describe('ai-engine /api/cron/ai-engine', () => {
  beforeEach(() => {
    tradingSignalsInserts.length = 0;
    decisionLogInserts.length = 0;
    featureStoreInserts.length = 0;
    vi.clearAllMocks();
  });

  it('skriver trading_signals SELV OM ai_decision_log-inserten feiler', async () => {
    const res = await GET({} as Request);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // Kritisk: master-signalet må ha nådd trading_signals til tross for
    // ai_decision_log-feilen (dette var det som var ødelagt)
    expect(tradingSignalsInserts.length).toBeGreaterThan(0);
    const master = tradingSignalsInserts.find(
      (s) => (s as { agent_id?: string }).agent_id === 'ensemble_master',
    );
    expect(master).toBeDefined();
    expect((master as { signal_type: string }).signal_type).toBe('ensemble_ai');
  });

  it('bruker gyldig systembruker-ID i ai_decision_log (FK mot auth.users)', async () => {
    await GET({} as Request);

    // ai_decision_log-inserten må referere til en eksisterende systembruker
    // (b0700000-0000-0000-0000-000000000001 = algo1@klarpakke.no)
    const decisionRow = decisionLogInserts[0] as { user_id?: string };
    expect(decisionRow.user_id).toBe('b0700000-0000-0000-0000-000000000001');
  });
});
