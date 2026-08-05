-- Sjekk vault.decrypted_secrets for cron-relaterte secrets
SELECT name FROM vault.decrypted_secrets WHERE name LIKE '%cron%' OR name LIKE '%health%' OR name LIKE '%webhook%';
