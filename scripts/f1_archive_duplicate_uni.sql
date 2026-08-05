-- Feiljeger-fiks: Arkiver eldre paused UNIUSDT-sesjon for e2e-testbruker
-- Rotårsak: detect-crashed-sessions cron prøver å hele denne, men det finnes allerede aktiv UNIUSDT.
-- Arkivering hindrer gjentatte duplicate-key-feil (2292 ganger siste 24t).
UPDATE trading_sessions
SET archived = true, archived_at = NOW(), status = 'stopped', last_status_message = 'Arkivert av Feiljeger: duplikat UNIUSDT-sesjon, nyere aktiv eksisterer'
WHERE id = 'c17a5c82-331e-439d-a52d-39a4af98a9c4'
  AND user_id = '1016b26e-f165-4046-a356-a1146bc98af9';
