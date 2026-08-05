-- Sjekk vault.decrypted_secrets innhold (kun navn, ikke verdier)
SELECT name FROM vault.decrypted_secrets ORDER BY name;
