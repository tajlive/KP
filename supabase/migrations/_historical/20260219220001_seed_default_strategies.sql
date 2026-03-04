-- Sprint 12: Seed default auto-trading strategier
-- Gir brukere noen forhåndskonfigurerte strategier å teste

INSERT INTO public.auto_trading_strategies (
  name,
  description,
  risk_level,
  min_tier,
  entry_rules,
  exit_rules,
  stop_loss_percent,
  take_profit_percent,
  position_size_percent,
  max_positions,
  is_active,
  created_at,
  updated_at
)
VALUES
(
  'RSI Oversold/Overbought',
  'Kjøp når RSI < 30 (oversold), selg når RSI > 70 (overbought). Enkel og trygg strategi for nybegynnere.',
  'low',
  'master',
  '{
    "conditions": [
      {"indicator": "rsi", "operator": "<", "value": 30}
    ],
    "logic": "and"
  }'::jsonb,
  '{
    "conditions": [
      {"indicator": "rsi", "operator": ">", "value": 70}
    ],
    "logic": "or",
    "stopLoss": true,
    "takeProfit": true
  }'::jsonb,
  2.0,
  5.0,
  10.0,
  3,
  true,
  NOW(),
  NOW()
),
(
  'SMA Crossover (20/50)',
  'Kjøp når SMA(20) krysser over SMA(50), selg når det krysser under. Klassisk trend-følgende strategi.',
  'medium',
  'master',
  '{
    "conditions": [
      {"indicator": "sma20", "operator": "crosses_above", "value": "sma50"}
    ],
    "logic": "and"
  }'::jsonb,
  '{
    "conditions": [
      {"indicator": "sma20", "operator": "crosses_below", "value": "sma50"}
    ],
    "logic": "or",
    "stopLoss": true,
    "takeProfit": true
  }'::jsonb,
  3.0,
  8.0,
  15.0,
  5,
  true,
  NOW(),
  NOW()
),
(
  'MACD Momentum',
  'Kjøp når MACD krysser signal-linjen oppover, selg når den krysser nedover. Identifiserer momentum-skift.',
  'high',
  'phd',
  '{
    "conditions": [
      {"indicator": "macd", "operator": "crosses_above", "value": "macd_signal"},
      {"indicator": "rsi", "operator": ">", "value": 40}
    ],
    "logic": "and"
  }'::jsonb,
  '{
    "conditions": [
      {"indicator": "macd", "operator": "crosses_below", "value": "macd_signal"}
    ],
    "logic": "or",
    "stopLoss": true,
    "takeProfit": true
  }'::jsonb,
  5.0,
  12.0,
  20.0,
  5,
  true,
  NOW(),
  NOW()
),
(
  'Volume Breakout',
  'Kjøp ved høyt volum + prisøkning, selg ved lavt volum. Aggressiv strategi for erfarne traders.',
  'high',
  'phd',
  '{
    "conditions": [
      {"indicator": "volume", "operator": ">", "value": "volume_avg_20"},
      {"indicator": "price", "operator": ">", "value": "sma20"}
    ],
    "logic": "and"
  }'::jsonb,
  '{
    "conditions": [
      {"indicator": "volume", "operator": "<", "value": "volume_avg_20"}
    ],
    "logic": "or",
    "stopLoss": true,
    "takeProfit": true
  }'::jsonb,
  4.0,
  10.0,
  12.0,
  3,
  true,
  NOW(),
  NOW()
),
(
  'Conservative DCA',
  'Dollar Cost Averaging med RSI-filter. Kjøp regelmessig når RSI < 50. Perfekt for langsiktige investorer.',
  'low',
  'master',
  '{
    "conditions": [
      {"indicator": "rsi", "operator": "<", "value": 50},
      {"indicator": "price", "operator": "<", "value": "sma50"}
    ],
    "logic": "and"
  }'::jsonb,
  '{
    "conditions": [
      {"indicator": "rsi", "operator": ">", "value": 80}
    ],
    "logic": "or",
    "stopLoss": true,
    "takeProfit": false
  }'::jsonb,
  1.5,
  15.0,
  5.0,
  10,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Bekreft at strategier er lagt til
SELECT 
  name, 
  risk_level, 
  min_tier,
  stop_loss_percent,
  take_profit_percent,
  is_active
FROM public.auto_trading_strategies
ORDER BY 
  CASE risk_level 
    WHEN 'low' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'high' THEN 3
  END;
