-- System-rydding: inflerte sesjoner, inkonsistent state, ugyldige trades
-- Gjelder alle brukere. Idempotent — kan kjøres flere ganger.

BEGIN;

-- 1) Arkivert + aktiv er inkonsistent. Arkivering betyr historikk/stoppet.
UPDATE trading_sessions
SET status = 'stopped'
WHERE archived = true
  AND status = 'active';

-- 2) Negativ kvantitet er ugyldig — fjern disse corrupte trade-radene.
-- De tilhører stoppede/arkiverte sesjoner og påvirker ikke live-balanser.
DELETE FROM trades
WHERE quantity < 0;

-- 3) Sørg for at det finnes maks én aktiv paper-sesjon per bruker.
-- Hvis en bruker har flere aktive paper-sesjoner, behold den nyeste og stopp resten.
WITH ranked AS (
  SELECT id, user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at DESC, id DESC) AS rn
  FROM trading_sessions
  WHERE mode = 'paper' AND status = 'active'
)
UPDATE trading_sessions ts
SET status = 'stopped'
FROM ranked r
WHERE ts.id = r.id
  AND r.rn > 1;

COMMIT;

-- 4) Etter datafiks: tilføy guard-constraints for å forhindre gjentakelse.
-- Kjøres utenfor transaksjon fordi de krever eksklusivt schema-lock.
DO $$
BEGIN
    -- Negativ kvantitet skal aldri kunne lagres
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trades_quantity_positive'
    ) THEN
        ALTER TABLE trades ADD CONSTRAINT trades_quantity_positive CHECK (quantity > 0);
    END IF;
END
$$;

-- 5) Index + trigger for å oppdage/godta maks én aktiv paper-sesjon per bruker.
-- Partial unik index: kun én aktiv paper-sesjon per bruker.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_paper_session_per_user
ON trading_sessions (user_id)
WHERE mode = 'paper' AND status = 'active';

-- 6) Trigger: arkiverte sesjoner kan ikke markeres aktive.
CREATE OR REPLACE FUNCTION prevent_archived_active()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.archived = true AND NEW.status = 'active' THEN
        RAISE EXCEPTION 'Arkivert sesjon kan ikke være aktiv';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_archived_active ON trading_sessions;
CREATE TRIGGER trg_prevent_archived_active
    BEFORE INSERT OR UPDATE ON trading_sessions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_archived_active();
