# Supabase DB MCP (supabase-db)

Egen MCP-server som snakker **direkte med Postgres** via `DATABASE_URL`. Fungerer uten Supabase Management API-token.

## Oppsett

1. **DATABASE_URL** i `.env.local`  
   Fra Supabase Dashboard → Project Settings → Database → Connection string (Transaction pooler, port 6543).  
   Eksempel: `postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres`

2. **Cursor**  
   I `.cursor/mcp.json` er `supabase-db` allerede konfigurert til å kjøre `node scripts/run-supabase-mcp.mjs`. Wrapperen laster `.env.local` og starter MCP-serveren.

3. **Start Cursor på nytt** (eller reload MCP) så vises `supabase-db` med verktøyene under.

## Verktøy

| Verktøy | Beskrivelse |
|--------|-------------|
| **execute_sql** | Kjører rå SQL (SELECT, DDL, DML). Parameter: `query` (string). |
| **list_tables** | Lister tabeller i ett eller flere schemas. Parametre: `schemas` (default `["public"]`), `verbose` (default false; kolonner, PK, FK). |
| **apply_migration** | Kjører en migrasjon (DDL). Parametre: `name` (snake_case), `query` (SQL). Wrapper i transaksjon (BEGIN/COMMIT/ROLLBACK). |

## Sammenligning med offisiell Supabase MCP

| | supabase (offisiell) | supabase-db (denne) |
|---|----------------------|----------------------|
| Auth | `SUPABASE_ACCESS_TOKEN` (Dashboard API) | `DATABASE_URL` (Postgres) |
| Bruk | Management API, migrasjoner, types | Rå SQL, list_tables, apply_migration |
| Når den feiler | Token mangler eller utløper | DATABASE_URL mangler eller feil |

Begge kan være aktive samtidig. Bruk **supabase-db** for å kjøre Realtime-SQL, migrasjoner og ad-hoc spørringer når du har `DATABASE_URL` i `.env.local`.
