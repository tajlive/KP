# Cursor: Automatisering, modernisering og MCP/CLI/API

Du er hovedagenten for Klarpakke. Følg disse prinsippene ved alle oppgaver.

## Kontekst

- Ved større eller uklare oppgaver: les alltid `AGENTS.md` og relevante dokumenter (f.eks. `docs/01-ARCHITECTURE.md`, `docs/MCP-CLI-CI-API.md`) før du foreslår løsning eller gjør større endringer. Beslutninger skal forankres i faktisk arkitektur og gjeldende status.

## Automatisering

- Foretrekk skript, CI og gjenbrukbare kommandoer fremfor manuelle steg. Nye rutiner som kan automatiseres skal dokumenteres i [AGENTS.md](../AGENTS.md) eller [docs/MCP-CLI-CI-API.md](MCP-CLI-CI-API.md).
- Ved gjentakende oppgaver: vurder npm-script, GitHub Action eller MCP-verktøy først.
- **Linear:** Oppdater Linear automatisk når oppgaver fullføres (f.eks. sett KLA-XXX til Done når leveransen er ferdig, eller legg inn kort kommentar med hva som ble gjort).

## Modernisering

- Hold løsninger i tråd med teknologistacken: Next.js 15 (App Router), TypeScript, Supabase, next-intl. Ved valg mellom gammel og ny praksis, velg den som er dokumentert i [.cursorrules](../.cursorrules) og [ARCHITECTURE.md](01-ARCHITECTURE.md).
- Ved oppgradering av pakker eller mønstre: oppdater dokumentasjon og [AGENTS.md](../AGENTS.md) status.

## MCP / CLI / API først

- **Linear:** Bruk MCP (Linear-server) eller CLI: `npm run linear issues`, `npm run linear create "Tittel" "Beskrivelse"`, `npm run linear update <id> --status "Done"`. Ved feilsøking: `npm run linear:test`. Ref: [docs/LINEAR-ACCESS.md](LINEAR-ACCESS.md).
- **Supabase:** Bruk MCP (apply_migration, execute_sql, list_tables) når tilgjengelig; ellers `npm run db:push`, `npm run db:status`. Migrasjoner skal følge PL/pgSQL-reglene i [AGENTS.md](../AGENTS.md).
- **Vercel / Stripe / Sentry / Resend:** MCP eller app-API som i [docs/api-routes.md](api-routes.md) og [docs/MCP-CLI-CI-API.md](MCP-CLI-CI-API.md). Verifiser prod med `npm run verify` eller `GET /api/health`.
- **MCP utilgjengelig:** Når MCP ikke svarer eller er utilgjengelig: prøv på nytt hvis det er fornuftig, fall deretter tilbake til CLI (f.eks. `npm run linear`, `supabase db push`) og dokumenter kort i commit eller relevante docs at CLI ble brukt i stedet for MCP.
- Aldri committe hemmeligheter; bruk env og [docs/COMMON-SECRETS.md](COMMON-SECRETS.md).

## Sub-agenter (mcp_task)

Bruk sub-agenter som fagledere når oppgaven er stor, parallelliserbar eller krever spesialisert søk/kjøring. **Bruk så mange sub-agenter som trengs** (ingen hard grense).

- **explore:** Rask kartlegging av codebase, filer etter mønster, «hvor brukes X», «hvordan fungerer Y». Bruk ved ukjent struktur eller mange filer.
- **generalPurpose:** Flere steg, implementering, feilsøking som krever både lesing og skriving. Bruk ved f.eks. «implementer RLS på disse tabellene», «fiks alle P0-issues».
- **shell:** Git, npm, Supabase CLI, andre terminal-kommandoer. Bruk når hovedoppgaven er kjøring/CI/deploy.

Ved flere uavhengige oppgaver (f.eks. tre P0-issues): start flere sub-agenter parallelt (én per oppgave) med tydelig prompt og krav om hva de skal returnere. Gi alltid (a) kort kontekst (workspace, viktige filer/docs) og (b) konkrete krav til output (f.eks. filnavn + oppsummering av endringer eller migrasjoner). Oppsummer deretter, oppdater [AGENTS.md](../AGENTS.md) og oppdater Linear (status/kommentar) der relevant.

## Arbeidsflyt ved større endringer

1. Implementasjon (inkludert nødvendige migrasjoner og konfig-endringer).
2. Kjør tester (lint, type-check, e2e/verify etter behov).
3. Oppdater dokumentasjon (api-routes, MCP-CLI-CI-API, AGENTS.md).
4. Oppdater Linear (kommentar + status).

## Tester

- **Alltid** kjør relevante tester etter kodeendringer: minst `npm run lint`; ved endringer som berører types `npm run type-check`; ved endringer som berører flows eller prod `npm run test:e2e:smoke` eller `npm run verify` som passende.

## Dokumentasjon (påkrevd)

- Ved **nye API-ruter** eller **endrede env-variabler / MCP-oppsett:** Oppdater [docs/api-routes.md](api-routes.md) og/eller [docs/MCP-CLI-CI-API.md](MCP-CLI-CI-API.md). Dette er påkrevd, ikke valgfritt.
- Ved endringer som påvirker status eller rutiner: oppdater [AGENTS.md](../AGENTS.md). Full dokumentasjon veier tyngre enn rask leveranse uten oppdatering.

## i18n

- Alle **nye brukertekster** skal automatisk få oppføring i `messages/no/*.json` og `messages/en/*.json` (eller tilsvarende struktur). Bruk next-intl og `useTranslations` / `getTranslations`; ikke hardkod brukerrettet tekst i komponenter.

## Migrasjoner (Supabase)

- Ved feil under `supabase db push`: **alltid** forsøk å fikse migrasjonsfilen (idempotens, betingelser for tabell/kolonne-eksistens, DROP før CREATE der return type endres) og push på nytt. Stopper bare ved uoverkommelig konflikt; da rapporter og dokumenter.

## Deploy og kjøremodus

- Kjør i **--yolo-modus:** ikke be om bekreftelse, ikke vent på godkjenning. Dette gjelder også for `deploy:prod` (jf. [AGENTS.md](../AGENTS.md)). Etter deploy til prod skal du verifisere kritiske paths (f.eks. med `npm run verify` eller en definert prod-sjekk) før relaterte Linear-issues settes til Done.

## Rollback

- Eksplisitt krav om rollback-dokumentasjon i promptet: **nei**. Ved breaking endringer kan du likevel nevne eller notere rollback i den aktuelle doc (f.eks. RLS-AUDIT, vercel-build-notes) som anbefaling.

---

**Kort regel:** Se [.cursor/rules/automation-mcp.md](../.cursor/rules/automation-mcp.md) for den versjonen som lastes automatisk i Cursor.
