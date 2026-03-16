# Linear – full tilgang (MCP + CLI/API)

## 1. MCP (Cursor)

Linear MCP starter nå med **nøkkel fra `.env.local`** via wrapper, så du trenger ikke å eksportere `LINEAR_API_KEY` i shell.

### Oppsett

1. **API-nøkkel:** https://linear.app/settings/api → opprett Personal API Key.
2. **Legg i prosjekt:**  
   I `.env.local` (som allerede finnes):
   ```bash
   LINEAR_API_KEY=lin_api_...
   ```
3. **Cursor:** Start Cursor på nytt (eller reload MCP). Linear MCP kjører `node scripts/run-linear-mcp.mjs`, som leser `.env.local` og starter `linear-mcp-server@latest` med nøkkelen.

### Feilsøking

- **MCP vises ikke / ingen verktøy:** Sjekk at `LINEAR_API_KEY` står i `.env.local` uten anførselstegn rundt verdien (eller gyldig quoted string).
- **401 / ugyldig respons:** Kjør `npm run linear:test` for å verifisere nøkkel mot Linear API.
- **Wrapper:** `node scripts/run-linear-mcp.mjs` skal skrive "Linear MCP Server running on stdio" og avslutte ved Ctrl+C.

---

## 2. CLI/API (fallback uten MCP)

Når MCP ikke brukes (f.eks. i CI eller terminal), bruk scriptet som leser samme `.env.local`:

```bash
# Liste team (første team brukes som default ved create)
npm run linear teams

# Liste issues (default 20)
npm run linear issues
npm run linear issues 50

# Opprett issue (teamId valgfri – bruker første team)
npm run linear create "Tittel" "Beskrivelse"
npm run linear create "Tittel" "Beskrivelse" "<teamId>"

# Oppdater issue (--status kan være statusnavn f.eks. "Done", eller stateId UUID)
npm run linear update <issueId> --status "Done"
npm run linear update KLA-123 --title "Ny tittel"
```

Direkte:

```bash
node scripts/linear-api.mjs teams
node scripts/linear-api.mjs create "Production deploy 2026-03-15" "Se docs/linear-production-2026-03-15.md"
```

---

## 3. API-ruter (app)

Appen har admin-beskyttede ruter som bruker `LINEAR_API_KEY` fra Vercel/env:

- `GET /api/linear/me` – bruker og tilordnede issues (krever admin).
- `GET /api/linear/teams` – team (krever admin).
- `GET/POST /api/linear/issues` – liste/opprett issues (krever admin).

For at disse skal fungere i produksjon må **Vercel Environment Variables** inneholde `LINEAR_API_KEY` for production-miljøet (valgfritt, brukes kun av admin-dashboard).

---

## Oppsummert

| Tilgang        | Krav                    | Bruk |
|----------------|-------------------------|------|
| **MCP i Cursor** | `.env.local` med `LINEAR_API_KEY` + omstart Cursor | Agent/du i Cursor |
| **CLI**        | Samme `.env.local`      | `npm run linear …` / `node scripts/linear-api.mjs …` |
| **API-ruter**  | `LINEAR_API_KEY` i Vercel (og admin-bruker) | Dashboard / eksterne kall |

---

## Sentry (produksjon)

For å sikre at error events mottas fra Vercel: sett `NEXT_PUBLIC_SENTRY_DSN` i Vercel Environment Variables for production. Full oversikt over env-variabler og verifikasjon: **docs/SENTRY-PROD.md**.
