-- USDT/NOK rate for paper trading (updated by cron /api/cron/update-usdt-nok)
ALTER TABLE public.global_settings
ADD COLUMN IF NOT EXISTS usdt_nok_rate NUMERIC(12,4) DEFAULT 10.8;

UPDATE public.global_settings
SET usdt_nok_rate = 10.8
WHERE id = 1 AND usdt_nok_rate IS NULL;

COMMENT ON COLUMN public.global_settings.usdt_nok_rate IS 'USDT to NOK rate for paper trading; updated by /api/cron/update-usdt-nok';
