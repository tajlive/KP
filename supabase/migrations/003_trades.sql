CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  quantity DECIMAL(15,8) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  profit_loss DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON public.trades FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX trades_portfolio_id_idx ON public.trades(portfolio_id);
CREATE INDEX trades_user_id_idx ON public.trades(user_id);
CREATE INDEX trades_symbol_idx ON public.trades(symbol);
CREATE INDEX trades_created_at_idx ON public.trades(created_at DESC);
