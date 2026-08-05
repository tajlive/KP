-- Sjekk detect_crashed_sessions() kilde
SELECT prosrc FROM pg_proc WHERE proname = 'detect_crashed_sessions';
