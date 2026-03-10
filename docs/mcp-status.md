# Klarpakke MCP Status

> Sist oppdatert: 2026-03-10  
> Arkitekt: Perplexity Pro (Chief Architect)  
> Utført av: tajlive

## 7/8 MCP-tilkoblinger ✅ — KLAR FOR PRODUKSJON

| # | Tjeneste | Status | Brukes til | Token-type |
|---|----------|--------|------------|------------|
| 1 | **GitHub API** | ✅ OK | Kode, PR, issues, branches | PAT Classic (90d) |
| 2 | **Supabase REST** | ✅ OK | DB-spørringer, auth, storage | Service Role Key |
| 3 | **Supabase psql** | ✅ OK | Direkte SQL, migrasjoner, schema-dump | DATABASE_URL |
| 4 | **Linear API** | ✅ OK | Issues, sprints, roadmap | Personal API Key |
| 5 | **Vercel API** | ✅ OK | Deployments, env vars, previews | Access Token |
| 6 | **Stripe API** | ✅ OK | Betalinger, subscriptions (live!) | Secret Key |
| 7 | **Sentry** | ⚠️ CLI | Bygg, source maps, deploy | CLI Auth Token |
| 8 | **Resend API** | ✅ OK | Transaksjonell e-post, templates | API Key |
| 9 | **Plausible** | ✅ OK | GDPR-compliant analytics | Ingen nøkkel |

### Sentry-notis
CLI auth-token (`sntrys_...`) fungerer for:
- `sentry-cli` kommandoer
- Next.js build-integrasjon
- Source map uploads

For full REST API-tilgang: opprett API-token på https://sentry.io/settings/account/api/auth-tokens/  
Ikke blokkerende for produksjon.

---

## AI-arbeidsflyt

```
Perplexity Pro (Chief Architect)
  ✅ GitHub MCP direkte
  → Arkitektur, analyse, KIMI-prompts, kodegjennomgang
  → Leser/skriver filer, PRs, issues i tajlive/KP
        │
        ▼
    KIMI 2.5 Code
      → Tung kodeproduksjon
      → Bruker docs/database-schema.md som DB-kontekst
        │
        ▼
    Cursor + Claude
      ✅ Alle 8 MCP live (Supabase, Linear, Vercel, Stripe, Sentry, Resend, GitHub, Playwright)
      → Utfører i kode, kjører SQL, deployer
```

---

## Verktøykasse

### MCP-servere i `.cursor/mcp.json`
- `github` — @modelcontextprotocol/server-github
- `linear` — linear-mcp-server
- `supabase` — @supabase/mcp-server-supabase
- `vercel` — @vercel/mcp-adapter
- `stripe` — @stripe/agent-toolkit
- `sentry` — @sentry/mcp-server
- `playwright` — @playwright/mcp
- `resend` — resend-mcp *(lagt til 2026-03-10)*

### Scripts
```bash
npm run test:mcp        # Verifiser alle MCP-tilkoblinger
npm run db:schema       # Dump DB-skjema til docs/database-schema.md
npm run verify:prod     # Smoke-test produksjon
npm run deploy:prod     # Deploy til Vercel
```

### Nyttige filer
- `.cursor/mcp.json` — MCP-konfigurasjon (placeholders, safe to commit)
- `.env.local.example` — Mal for alle nøkler med dashbord-lenker
- `docs/github-token-setup.md` — GitHub PAT + Sentry API-token guide
- `scripts/test-mcp-connections.sh` — Full tilkoblings-verifikasjon
- `scripts/dump-schema.sh` — DB-schema til markdown (for AI-kontekst)

---

## Neste steg etter lansering

- [ ] Sentry API-token (valgfritt — 8/8 score)
- [ ] `bash scripts/dump-schema.sh` → del `docs/database-schema.md` med arkitekt
- [ ] Sett opp Plausible dashboard for klarpakke.no
- [ ] Ruter GITHUB_TOKEN ved 90-dagers utløp
