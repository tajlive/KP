-- ============================================================================
-- Fase 1: Full Copy-Trading — Binance + Intern Deling
-- Nye tabeller: binance_traders, binance_trader_positions,
--               copy_trading_external_follows, copy_trading_mirror_trades
-- Endringer:  trading_sessions.is_leaderboard_visible,
--             user_profiles.show_on_leaderboard
-- ============================================================================

-- ── 1. binance_traders: Cache av Binance Futures Leaderboard ────────────────
CREATE TABLE IF NOT EXISTS binance_traders (
    encrypted_uid       TEXT PRIMARY KEY,
    nick_name           TEXT NOT NULL DEFAULT 'Anonymous',
    avatar              TEXT,
    rank                INT,
    total_return        NUMERIC DEFAULT 0,
    sharpe_ratio        NUMERIC DEFAULT 0,
    win_rate            NUMERIC DEFAULT 0,
    max_drawdown        NUMERIC DEFAULT 0,
    trade_count         INT DEFAULT 0,
    follower_count      INT DEFAULT 0,
    days_since_created  INT DEFAULT 0,
    risk_score          INT DEFAULT 100,
    risk_level          TEXT DEFAULT 'low',
    synced_at           TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE binance_traders IS 'Cache av Binance Futures Leaderboard — refreshes hvert 5. minutt';

CREATE INDEX IF NOT EXISTS idx_binance_traders_rank ON binance_traders(rank);
CREATE INDEX IF NOT EXISTS idx_binance_traders_synced ON binance_traders(synced_at);

-- ── 2. binance_trader_positions: Snapshot av åpne posisjoner ───────────────
CREATE TABLE IF NOT EXISTS binance_trader_positions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encrypted_uid   TEXT NOT NULL REFERENCES binance_traders(encrypted_uid) ON DELETE CASCADE,
    symbol          TEXT NOT NULL,
    side            TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
    entry_price     NUMERIC DEFAULT 0,
    mark_price      NUMERIC DEFAULT 0,
    pnl             NUMERIC DEFAULT 0,
    roe             NUMERIC DEFAULT 0,
    quantity        NUMERIC DEFAULT 0,
    leverage        INT DEFAULT 1,
    synced_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE binance_trader_positions IS 'Snapshot av åpne posisjoner fra fulgte Binance tradere';

CREATE INDEX IF NOT EXISTS idx_btp_uid ON binance_trader_positions(encrypted_uid);
CREATE INDEX IF NOT EXISTS idx_btp_synced ON binance_trader_positions(synced_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_btp_uid_symbol ON binance_trader_positions(encrypted_uid, symbol);

-- ── 3. copy_trading_external_follows: Følging av Binance tradere ───────────
CREATE TABLE IF NOT EXISTS copy_trading_external_follows (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    external_leader_id  TEXT NOT NULL REFERENCES binance_traders(encrypted_uid) ON DELETE CASCADE,
    leader_source       TEXT NOT NULL DEFAULT 'binance' CHECK (leader_source IN ('binance', 'internal')),
    scale_factor        NUMERIC NOT NULL DEFAULT 1.0 CHECK (scale_factor > 0 AND scale_factor <= 5),
    allocation_percent  NUMERIC NOT NULL DEFAULT 10 CHECK (allocation_percent > 0 AND allocation_percent <= 100),
    max_trade_amount    NUMERIC,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (follower_id, external_leader_id)
);

COMMENT ON TABLE copy_trading_external_follows IS 'Følgerelasjoner til eksterne tradere (Binance leaderboard)';

CREATE INDEX IF NOT EXISTS idx_ctef_follower ON copy_trading_external_follows(follower_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ctef_leader ON copy_trading_external_follows(external_leader_id) WHERE is_active = true;

-- ── 4. copy_trading_mirror_trades: Sporing av kopierte trades ──────────────
CREATE TABLE IF NOT EXISTS copy_trading_mirror_trades (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follow_id           UUID NOT NULL REFERENCES copy_trading_external_follows(id) ON DELETE CASCADE,
    session_id          UUID REFERENCES trading_sessions(id) ON DELETE SET NULL,
    original_symbol     TEXT NOT NULL,
    original_side       TEXT NOT NULL,
    copied_side         TEXT NOT NULL CHECK (copied_side IN ('buy', 'sell')),
    copied_quantity     NUMERIC NOT NULL DEFAULT 0,
    copied_price        NUMERIC NOT NULL DEFAULT 0,
    scale_factor        NUMERIC NOT NULL DEFAULT 1.0,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'failed')),
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE copy_trading_mirror_trades IS 'Logg over trades kopiert fra eksterne ledere til Klarpakke-sessions';

CREATE INDEX IF NOT EXISTS idx_ctmt_follow ON copy_trading_mirror_trades(follow_id);
CREATE INDEX IF NOT EXISTS idx_ctmt_session ON copy_trading_mirror_trades(session_id);
CREATE INDEX IF NOT EXISTS idx_ctmt_status ON copy_trading_mirror_trades(status);
CREATE INDEX IF NOT EXISTS idx_ctmt_created ON copy_trading_mirror_trades(created_at);

-- ── 5. Endringer på eksisterende tabeller ──────────────────────────────────

-- Legg til visnings-flagg på trading_sessions
ALTER TABLE trading_sessions
    ADD COLUMN IF NOT EXISTS is_leaderboard_visible BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN trading_sessions.is_leaderboard_visible IS 'Om sessionens trades vises på offentlig leaderboard';

-- Legg til visnings-flagg på user_profiles
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS show_on_leaderboard BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.show_on_leaderboard IS 'Om brukeren vises på intern leaderboard for copy-trading';

-- ── 6. RLS Policies ────────────────────────────────────────────────────────

-- binance_traders: offentlig lesbar
ALTER TABLE binance_traders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Binance traders public read" ON binance_traders;
CREATE POLICY "Binance traders public read" ON binance_traders
    FOR SELECT USING (true);

-- binance_trader_positions: offentlig lesbar
ALTER TABLE binance_trader_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Binance positions public read" ON binance_trader_positions;
CREATE POLICY "Binance positions public read" ON binance_trader_positions
    FOR SELECT USING (true);

-- copy_trading_external_follows: brukere ser og administrerer egne
ALTER TABLE copy_trading_external_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own external follows" ON copy_trading_external_follows;
CREATE POLICY "Users see own external follows" ON copy_trading_external_follows
    FOR SELECT USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users manage own external follows" ON copy_trading_external_follows;
CREATE POLICY "Users manage own external follows" ON copy_trading_external_follows
    FOR ALL USING (auth.uid() = follower_id);

-- copy_trading_mirror_trades: brukere ser egne via follow_id join
ALTER TABLE copy_trading_mirror_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own mirror trades" ON copy_trading_mirror_trades;
CREATE POLICY "Users see own mirror trades" ON copy_trading_mirror_trades
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM copy_trading_external_follows f
            WHERE f.id = copy_trading_mirror_trades.follow_id
            AND f.follower_id = auth.uid()
        )
    );

-- ── 7. Grants ──────────────────────────────────────────────────────────────
GRANT SELECT ON binance_traders TO authenticated;
GRANT SELECT ON binance_traders TO anon;
GRANT SELECT ON binance_trader_positions TO authenticated;
GRANT SELECT ON binance_trader_positions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON copy_trading_external_follows TO authenticated;
GRANT SELECT ON copy_trading_mirror_trades TO authenticated;

-- ── 8. Trigger: auto-update updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_copy_trading_external_follows_updated_at ON copy_trading_external_follows;
CREATE TRIGGER update_copy_trading_external_follows_updated_at
    BEFORE UPDATE ON copy_trading_external_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
