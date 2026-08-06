# CRON_SECRET — To separate lagre, én fallgruve

Klarpakke har **to separate CRON_SECRET-verdier** som lever på forskjellige steder og
autentiserer forskjellige ting. De er IKKE samme verdi. Å forveksle dem gir 401.

## 1. Vault CRON_SECRET (pg_cron → Vercel API)

**Hvor:** `vault.secrets` i Supabase-databasen (satt via migrasjon 20260420020000_harden_cron_with_vault.sql)

**Verdi (fra migrasjonen):**
```
581260aab4a12c3de264c0094f2e884f1306e82be43aa87e27c541ff19708f2c
```

**Brukt av:** `klarpakke_trigger_cron(path TEXT)` — plpgsql-funksjonen som pg_cron kaller.
Leser secret fra `vault.decrypted_secrets WHERE name = 'CRON_SECRET'`, med fallback til
`current_setting('app.cron_secret', true)`.

**Hva den autentiserer:** HTTP POST til Vercel API-endepunkter (Next.js API-ruter som
`/api/cron/sync-prices`, `/api/cron/ai-engine`, etc.) via `pg_net.http_post()`.

**Hvordan finne:** `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';`
(eller les fra migrasjonsfilen).

## 2. Edge Function CRON_SECRET (Supabase Edge Functions)

**Hvor:** Satt som `supabase secrets set CRON_SECRET=...` i Supabase-prosjektet, tilgjengelig
via `Deno.env.get("CRON_SECRET")` inne i Edge Functions.

**Verdi (fra `.env.local`):**
```
d2f5fecfc0d684d75d2dc4709fb05a3724d248ef4792b911cd7e7727abe0273a
```

**Brukt av:** Edge Functions som `smart-trader-v3` — leser fra `Deno.env.get("CRON_SECRET")`
og verifiserer `Authorization: Bearer <CRON_SECRET>`.

**Hva den autentiserer:** Direkte HTTP-kall til Supabase Edge Functions
(`https://<ref>.supabase.co/functions/v1/<name>`).

**Hvordan finne:** `grep ^CRON_SECRET .env.local` (eller supabase CLI: `supabase secrets list`
om du har tilgang til prosjektet).

## Fallgruve

Å bruke Vault-verdien mot Edge Functions gir 401 Unauthorized, og omvendt. De er
bevisst forskjellige — Vault-secretet er hardkodet i migrasjon (synlig for alle med
repo-tilgang), mens Edge Function-secretet lever i Supabase-prosjektets miljøvariabler.

## Hvordan kalle Edge Functions riktig

```bash
CRON_SECRET="d2f5fecfc0d684d75d2dc4709fb05a3724d248ef4792b911cd7e7727abe0273a"
curl -X POST "https://pskhryjzkobytnfwucrb.supabase.co/functions/v1/smart-trader-v3" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"cron":true,"mode":"paper"}'
```
