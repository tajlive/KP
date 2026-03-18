# Notis for Supabase MCP

Referanse når du bruker Supabase MCP (execute_sql, apply_migration, list_migrations, osv.) i Klarpakke.

---

## Migrasjoner – kanonisk flyt

- **DDL (CREATE/ALTER/DROP):** Bruk **`apply_migration`** med migrasjonsnavn og SQL-innhold. Ikke kjør DDL via `execute_sql` for å unngå at det ikke kommer med i migrasjonshistorikk.
- **Kun lese/kjøre ad-hoc SELECT/INSERT/UPDATE:** Bruk **`execute_sql`**.
- **Source of truth for migrasjoner:** Repoet `supabase/migrations/`. Varig løsning: **Supabase GitHub-integrasjon** med «Deploy to production» som eneste som pusher til prod – se **docs/SUPABASE-MIGRASJONER-VARIG-LOSNING.md**.

## Ved «Remote migration versions not found»

- Kjør **`npm run db:repair-history`** (reverter versjoner CLI nevner), deretter **`npm run db:push:all`**. Ikke bruk MCP til å reparere migrasjonshistorikk; bruk CLI lokalt eller i CI.

## Prosjekt

- **Project ref:** `vuxbjlykgmzskxbclquf`.
- **MCP:** Supabase-serveren er konfigurert i `.cursor/mcp.json` (access token + project-ref). Supabase-db (egen MCP) kjører via `scripts/run-supabase-mcp.mjs` og kan kreve `DATABASE_URL` i `.env.local`.

## PSQL / API i stedet for CLI

- **PSQL:** `./scripts/sql.sh file supabase/migrations/<fil>.sql` (krever `DATABASE_URL` i .env.local). Oppdaterer ikke migrasjonshistorikk – bruk `migration repair --status applied <versjon>` etterpå om nødvendig.
- **Dashboard:** SQL Editor → lim inn migrasjons-SQL → Run.
- **MCP:** `execute_sql` for ad-hoc; `apply_migration` for DDL med migrasjonsnavn + query. Se **docs/AUTOMATISERE-DB-OG-MIGRASJONER.md** §5.

## MCP vs CLI – når er hva optimalt?

| Oppgave                                        | Optimalt verktøy                                              | Merk                                                   |
| ---------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| Kjør én DDL-migrasjon (view, tabell, funksjon) | **MCP `apply_migration`**                                     | Projekt-id + name + query. Fungerer uten DATABASE_URL. |
| Ad-hoc SELECT/INSERT/UPDATE                    | **MCP `execute_sql`**                                         | Eller Dashboard SQL Editor.                            |
| Full migrasjonspush (alle filer i rekkefølge)  | **CLI `db push` / `db:push:all`**                             | MCP har ikke «push alle migrasjoner».                  |
| Reparere migrasjonshistorikk (revert/applied)  | **CLI `migration repair`**                                    | MCP har ikke repair.                                   |
| Liste migrasjoner, branches, edge functions    | **MCP** (list_migrations, list_branches, list_edge_functions) | Rask oversikt.                                         |

**Oppsummert:** MCP er optimal for å kjøre enkelt-SQL og enkeltmigrasjoner mot prosjektet. CLI er nødvendig for push av hele migrasjonssettet og for repair av historikk.

## Relaterte docs

- **docs/SUPABASE-MIGRASJONER-VARIG-LOSNING.md** – varig automatisk migrasjon (GitHub-integrasjon / én CI-kanal).
- **docs/AUTOMATISERE-DB-OG-MIGRASJONER.md** – repair, db:push:all, **§5 PSQL/API**.
- **docs/MCP-CLI-CI-API.md** – SQL/migrasjon-hurtigreferanse.
