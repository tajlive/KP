-- Sjekk hva daily_integrity_check gjør
SELECT proname, prosrc FROM pg_proc WHERE proname = 'daily_integrity_check';
