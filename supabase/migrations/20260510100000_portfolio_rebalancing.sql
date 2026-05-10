-- Create portfolio rebalance configs table
CREATE TABLE IF NOT EXISTS public.portfolio_rebalance_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT false NOT NULL,
    target_allocations JSONB DEFAULT '{"BTC": 0.4, "ETH": 0.3, "SOL": 0.15, "BNB": 0.1, "XRP": 0.05}'::jsonb NOT NULL,
    threshold_percent NUMERIC DEFAULT 5.0 NOT NULL,
    twap_duration_hours INTEGER DEFAULT 24 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.portfolio_rebalance_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolio_rebalance_configs
CREATE POLICY "Users can view their own rebalance configs"
    ON public.portfolio_rebalance_configs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rebalance configs"
    ON public.portfolio_rebalance_configs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rebalance configs"
    ON public.portfolio_rebalance_configs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create portfolio rebalance events table
CREATE TABLE IF NOT EXISTS public.portfolio_rebalance_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    trigger_reason TEXT,
    current_allocations JSONB NOT NULL,
    target_allocations JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.portfolio_rebalance_events ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolio_rebalance_events
CREATE POLICY "Users can view their own rebalance events"
    ON public.portfolio_rebalance_events
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create portfolio rebalance orders table
CREATE TABLE IF NOT EXISTS public.portfolio_rebalance_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.portfolio_rebalance_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    amount_usdt NUMERIC NOT NULL,
    executed_amount_usdt NUMERIC DEFAULT 0 NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'failed')),
    twap_chunks INTEGER NOT NULL,
    executed_chunks INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.portfolio_rebalance_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolio_rebalance_orders
CREATE POLICY "Users can view their own rebalance orders"
    ON public.portfolio_rebalance_orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_portfolio_rebalance_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolio_rebalance_configs_updated_at
    BEFORE UPDATE ON public.portfolio_rebalance_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_rebalance_configs_updated_at();

CREATE OR REPLACE FUNCTION update_portfolio_rebalance_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolio_rebalance_orders_updated_at
    BEFORE UPDATE ON public.portfolio_rebalance_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_rebalance_orders_updated_at();
