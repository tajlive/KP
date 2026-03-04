-- ============================================================================
-- KLARPAKKE - STARTER COURSES (FIXED VERSION)
-- Description: Initial 3 courses for beta launch
-- ID is auto-generated as UUID
-- ============================================================================

-- ============================================================================
-- COURSE 1: TRADING GRUNNLEGGENDE
-- ============================================================================

INSERT INTO courses (
  slug,
  title,
  description,
  thumbnail_url,
  level,
  duration_minutes,
  is_published,
  is_free,
  price_nok,
  category,
  tags,
  sort_order
) VALUES (
  'trading-grunnleggende',
  'Trading Grunnleggende',
  'Lær de essensielle konseptene for å starte din trading-reise. Dette kurset dekker markedsstruktur, grunnleggende analyse, risikostyring, og hvordan du kan starte med paper trading uten risiko. Perfekt for nybegynnere som aldri har tradert før.',
  '/images/courses/trading-basics.jpg',
  'beginner',
  45,
  true,
  true,
  0,
  'Fundamentals',
  ARRAY['beginner', 'basics', 'fundamentals', 'risk-management'],
  1
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url,
  level = EXCLUDED.level,
  duration_minutes = EXCLUDED.duration_minutes,
  is_published = EXCLUDED.is_published,
  is_free = EXCLUDED.is_free,
  price_nok = EXCLUDED.price_nok,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ============================================================================
-- COURSE 2: TEKNISK ANALYSE
-- ============================================================================

INSERT INTO courses (
  slug,
  title,
  description,
  thumbnail_url,
  level,
  duration_minutes,
  is_published,
  is_free,
  price_nok,
  category,
  tags,
  sort_order
) VALUES (
  'teknisk-analyse-nybegynnere',
  'Teknisk Analyse for Nybegynnere',
  'Mestre kunsten å lese charts og identifisere trading-muligheter. Du lærer om support og resistance, trendlinjer, candlestick-mønstre, og de viktigste tekniske indikatorene som RSI, MACD, og moving averages. Kurset inkluderer praktiske eksempler fra ekte markets.',
  '/images/courses/technical-analysis.jpg',
  'beginner',
  60,
  true,
  false,
  497,
  'Technical Analysis',
  ARRAY['technical-analysis', 'charts', 'indicators', 'patterns'],
  2
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url,
  level = EXCLUDED.level,
  duration_minutes = EXCLUDED.duration_minutes,
  is_published = EXCLUDED.is_published,
  is_free = EXCLUDED.is_free,
  price_nok = EXCLUDED.price_nok,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ============================================================================
-- COURSE 3: PAPER TRADING MASTERY
-- ============================================================================

INSERT INTO courses (
  slug,
  title,
  description,
  thumbnail_url,
  level,
  duration_minutes,
  is_published,
  is_free,
  price_nok,
  category,
  tags,
  sort_order
) VALUES (
  'paper-trading-mastery',
  'Paper Trading Mastery',
  'Lær å bruke Klarpakke sin paper trading simulator til å øve uten risiko. Dette kurset viser deg hvordan du setter opp din første paper trading-konto, plasserer trades, bruker stop-loss og take-profit, og analyserer din performance. Få mestringsfølelse før du bruker ekte penger.',
  '/images/courses/paper-trading.jpg',
  'beginner',
  30,
  true,
  true,
  0,
  'Practice',
  ARRAY['paper-trading', 'simulator', 'practice', 'risk-free'],
  3
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url,
  level = EXCLUDED.level,
  duration_minutes = EXCLUDED.duration_minutes,
  is_published = EXCLUDED.is_published,
  is_free = EXCLUDED.is_free,
  price_nok = EXCLUDED.price_nok,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check courses were inserted
SELECT 
  title,
  slug,
  level,
  is_published,
  is_free,
  price_nok,
  duration_minutes
FROM courses
ORDER BY sort_order;

-- Success message
SELECT '✅ 3 starter courses created/updated successfully!' AS status;
