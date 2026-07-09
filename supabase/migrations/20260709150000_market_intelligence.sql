-- JokerTrade: market_intelligence tabell for AI-drevne trade-signaler
--
-- Denne tabellen lagrer AI-analyse fra Hermes Agent som JokerTrade
-- bruker til å generere trade-signaler. Hver rad representerer én
-- analyse-session — Reddit-scrape, sentiment-analyse, markedssignal.

CREATE TABLE IF NOT EXISTS public.market_intelligence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT,
  content TEXT,
  sentiment TEXT,
  sentiment_score NUMERIC(3,2),
  coins TEXT[],
  action TEXT,
  confidence INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indekser for rask spørring
CREATE INDEX IF NOT EXISTS idx_market_intelligence_created_at
  ON public.market_intelligence(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_intelligence_source
  ON public.market_intelligence(source);

-- RLS: alle kan lese, kun service role kan skrive
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read market intelligence"
  ON public.market_intelligence
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert market intelligence"
  ON public.market_intelligence
  FOR INSERT
  WITH CHECK (true);

-- Kommentarer for dokumentasjon
COMMENT ON TABLE public.market_intelligence IS 'AI-genererte markedsanalyser og trade-signaler fra JokerTrade';
COMMENT ON COLUMN public.market_intelligence.source IS 'Kilde: reddit, news, twitter, joker-ai';
COMMENT ON COLUMN public.market_intelligence.title IS 'Kort tittel på analysen';
COMMENT ON COLUMN public.market_intelligence.content IS 'Full AI-analyse i markdown';
COMMENT ON COLUMN public.market_intelligence.sentiment IS 'Sentiment: bullish, bearish, neutral';
COMMENT ON COLUMN public.market_intelligence.sentiment_score IS 'Sentiment-score fra -1.00 til 1.00';
COMMENT ON COLUMN public.market_intelligence.coins IS 'Array av coin-symboler analysen gjelder';
COMMENT ON COLUMN public.market_intelligence.action IS 'Anbefalt action: LONG, SHORT, HOLD, WAIT';
COMMENT ON COLUMN public.market_intelligence.confidence IS 'Confidence 0-100';
COMMENT ON COLUMN public.market_intelligence.created_at IS 'Tidspunkt for analyse';
