-- ═══════════════════════════════════════════════════════════════════════════
-- Kryptoekspert-optimalisering: tomarnejensen@gmail.com paper sessions
-- Dato: 2026-05-07
-- Mål: Tightere signaler, bedre diversifisering, redusert risk
-- ═══════════════════════════════════════════════════════════════════════════

-- Note: This migration targets specific strategy configs for user review.
-- It is idempotent via JSONB merge and safe to re-run.

-- Fase 1: Multisignal_aktiv — tighter RSI, ADX-filter, halvert pos-size
UPDATE trading_sessions
SET strategy_config = COALESCE(strategy_config, '{}'::jsonb) || jsonb_build_object(
  'rsi_buy_threshold', 35,
  'rsi_sell_threshold', 65,
  'position_size', 0.06,
  'max_position_size', 0.1,
  'trailing_stop_atr_mult', 2,
  'use_adx_filter', true,
  'adx_threshold', 20,
  'adx_period', 14
)
WHERE strategy_id LIKE '%multisignal%'
  AND mode = 'paper'
  AND status IN ('active', 'paused');

-- Fase 2: AI Copy — pivot til ETH, tighter exit, redusert pos-size
UPDATE trading_sessions
SET strategy_config = COALESCE(strategy_config, '{}'::jsonb) || jsonb_build_object(
  'position_size', 0.06,
  'hold_time_max_hours', 24,
  'use_atr_stop', true,
  'atr_stop_mult', 2
),
    trading_pair = CASE WHEN trading_pair = 'BTCUSDT' THEN 'ETHUSDT' ELSE trading_pair END
WHERE strategy_id LIKE '%ai_copy%'
  AND mode = 'paper'
  AND status IN ('active', 'paused');

-- Fase 3: DCA — øk interval til 4h, ATR-basert dip boost
UPDATE trading_sessions
SET strategy_config = COALESCE(strategy_config, '{}'::jsonb) || jsonb_build_object(
  'interval_minutes', 240,
  'use_atr_dip_boost', true
)
WHERE strategy_id LIKE '%dca%'
  AND mode = 'paper'
  AND status IN ('active', 'paused');

-- Fase 3: Grid — øk range til 30%, ATR-basert justering
UPDATE trading_sessions
SET strategy_config = COALESCE(strategy_config, '{}'::jsonb) || jsonb_build_object(
  'grid_range_pct', 30,
  'atr_based_range', true
)
WHERE strategy_id LIKE '%grid%'
  AND mode = 'paper'
  AND status IN ('active', 'paused');

-- Fase 3: Multi-signal (DOGE) — tighter RSI, redusert pos-size
UPDATE trading_sessions
SET strategy_config = COALESCE(strategy_config, '{}'::jsonb) || jsonb_build_object(
  'rsi_buy_threshold', 40,
  'rsi_sell_threshold', 60,
  'position_size', 0.06,
  'max_position_size', 0.1,
  'use_adx_filter', true,
  'adx_threshold', 20,
  'adx_period', 14
)
WHERE strategy_id LIKE '%multi_signal%'
  AND strategy_id NOT LIKE '%multisignal%'
  AND mode = 'paper'
  AND status IN ('active', 'paused');

-- Logg migrasjon
SELECT
  strategy_id,
  trading_pair,
  strategy_config->>'position_size' as position_size,
  strategy_config->>'rsi_buy_threshold' as rsi_buy,
  strategy_config->>'interval_minutes' as interval
FROM trading_sessions
WHERE mode = 'paper'
  AND status IN ('active', 'paused')
ORDER BY strategy_id;
