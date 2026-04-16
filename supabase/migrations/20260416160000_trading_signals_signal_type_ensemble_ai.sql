ALTER TABLE public.trading_signals
DROP CONSTRAINT IF EXISTS trading_signals_signal_type_check;

ALTER TABLE public.trading_signals
ADD CONSTRAINT trading_signals_signal_type_check
CHECK (signal_type = ANY (ARRAY['ai'::text, 'technical'::text, 'news'::text, 'manual'::text, 'ensemble_ai'::text]));
