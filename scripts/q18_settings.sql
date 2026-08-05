-- Sjekk app.settings for health-monitor URL
SELECT name, setting FROM pg_settings WHERE name LIKE '%app%health%' OR name LIKE '%webhook%' OR name LIKE '%url%';
