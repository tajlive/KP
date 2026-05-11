import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
CREATE OR REPLACE FUNCTION public.trigger_update_session_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_currency TEXT := 'NOK';
BEGIN
  -- 1. Update trading_sessions capital ONLY for paper mode.
  IF NEW.mode = 'paper' THEN
    UPDATE public.trading_sessions
    SET
      current_capital = CASE
        WHEN NEW.side::text = 'buy' THEN current_capital - NEW.total_value - COALESCE(NEW.fee, 0)
        WHEN NEW.side::text = 'sell' THEN current_capital + NEW.total_value - COALESCE(NEW.fee, 0)
        ELSE current_capital
      END,
      current_capital_nok = CASE
        WHEN NEW.side::text = 'buy' THEN current_capital_nok - NEW.total_value - COALESCE(NEW.fee, 0)
        WHEN NEW.side::text = 'sell' THEN current_capital_nok + NEW.total_value - COALESCE(NEW.fee, 0)
        ELSE current_capital_nok
      END
    WHERE id = NEW.session_id;
  END IF;

  -- 2. Update position state and trade counters
  UPDATE public.trading_sessions
  SET
    open_position = CASE
      WHEN NEW.side::text = 'buy' THEN jsonb_build_object(
        'side', 'long',
        'quantity', NEW.quantity,
        'entry_price', NEW.price,
        'entry_time', NEW.executed_at
      )
      WHEN NEW.side::text = 'sell' THEN NULL
      ELSE open_position
    END,
    total_trades = total_trades + 1,
    winning_trades = CASE
      WHEN NEW.realized_pnl IS NOT NULL AND NEW.realized_pnl > 0 THEN winning_trades + 1
      ELSE winning_trades
    END,
    losing_trades = CASE
      WHEN NEW.realized_pnl IS NOT NULL AND NEW.realized_pnl < 0 THEN losing_trades + 1
      ELSE losing_trades
    END,
    total_pnl = total_pnl + COALESCE(NEW.realized_pnl, 0),
    last_tick_at = now(),
    updated_at = now()
  WHERE id = NEW.session_id;

  -- 3. SYNC user_profiles.paper_balance = SUM of all active paper sessions
  UPDATE public.user_profiles
  SET paper_balance = COALESCE((
    SELECT SUM(current_capital_nok)
    FROM public.trading_sessions
    WHERE user_id = NEW.user_id
      AND mode = 'paper'
      AND status = 'active'
  ), 0)
  WHERE id = NEW.user_id;

  -- 4. SYNC wallets.balance (CURRENCY AWARE)
  IF NEW.mode = 'paper' THEN
    -- Update base currency
    INSERT INTO public.wallets (user_id, currency, balance)
    VALUES (NEW.user_id, NEW.symbol, CASE WHEN NEW.side::text = 'buy' THEN NEW.quantity ELSE -NEW.quantity END)
    ON CONFLICT (user_id, currency) DO UPDATE
    SET balance = public.wallets.balance + EXCLUDED.balance;

    -- Update quote currency
    INSERT INTO public.wallets (user_id, currency, balance)
    VALUES (NEW.user_id, v_quote_currency, CASE WHEN NEW.side::text = 'buy' THEN -(NEW.total_value + COALESCE(NEW.fee, 0)) ELSE (NEW.total_value - COALESCE(NEW.fee, 0)) END)
    ON CONFLICT (user_id, currency) DO UPDATE
    SET balance = public.wallets.balance + EXCLUDED.balance;
  END IF;

  -- 5. SYNC portfolios.current_balance
  UPDATE public.portfolios
  SET current_balance = COALESCE((
    SELECT SUM(current_capital_nok)
    FROM public.trading_sessions
    WHERE user_id = NEW.user_id
      AND status = 'active'
  ), 0)
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;
`;

async function applyFix() {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('Failed to apply trigger fix:', error);
  } else {
    console.log('Trigger fix applied successfully.');
  }
}

applyFix();
