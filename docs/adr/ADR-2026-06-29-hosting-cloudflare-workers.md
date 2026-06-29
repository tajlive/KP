# ADR: Hosting — Cloudflare Workers (OpenNext.js + Wrangler)

**Status:** Accepted  
**Date:** 2026-06-29  
**Author:** Lead Architect (KIMI)  
**Context:** Klarpakke har hatt tre hosting-plattformer på under ett år. Dokumentasjon og agent-instruksjoner var inkonsistente, noe som skapte risiko for feil deploy, feil feilsøking og forvirring blant AI-agenter og utviklere.

---

## Problem

Klarpakkes hosting-historikk hadde blitt fragmentert:

| Periode | Plattform | CI/CD | Status |
|---|---|---|---|
| 2024–2026-Q1 | Vercel | GitHub Actions / Vercel Git Integration | Utdatet |
| 2026-Q2 | Hetzner VPS + Coolify | Woodpecker CI | Utdatet |
| 2026-Q2–nå | Cloudflare Workers (OpenNext.js + Wrangler) | Cloudflare Workers Builds | **Gjeldende** |

Konsekvensen var at sentrale dokumenter (`WORKFLOW_RULES.md`, `ARCHITECTURE.md`, `EMERGENCY_PROD_FIX.md`, agent-prompts) beskrev forskjellige plattformer. Dette førte til:

- Feilaktige feilsøkingsrutiner (f.eks. "sjekk Vercel dashboard")
- Forvirring om hvordan secrets skulle settes (`vercel env` vs `wrangler secret`)
- Risiko for at agenter foreslo deploy-kommandoer som ikke lenger gjaldt
- Fragmentert forståelse av caching (R2/D1/DO) og runtime-grenser

---

## Decision

1. **Primær hosting:** Cloudflare Workers via OpenNext.js + Wrangler.
2. **Primær CI/CD:** Cloudflare Workers Builds, koblet direkte til GitHub-repoet (`tajlive/KP`), branch `main`.
3. **Backup deploy:** Wrangler CLI (`npm run cf:deploy`) kun ved nødsituasjon eller når Workers Builds feiler.
4. **Secrets management:** Cloudflare Worker secrets via Wrangler (`npx wrangler secret put`). Ingen Vercel-secrets.
5. **Caching:** R2 incremental cache + D1 tag cache + DO revalidation queue aktiveres med `OPENNEXT_ENABLE_R2_CACHE=true`.
6. **Dokumentasjonssource of truth:**
   - `.kimi/WORKFLOW_RULES.md` — arbeidsflyt og deploy-regler
   - `.kimi/EMERGENCY_PROD_FIX.md` — produksjonsfeilsøking
   - `docs/ARCHITECTURE.md` — systemarkitektur
   - `.kimi/KIMI.md` og `.kimi/agents/klarpakke-architect-agent.md` — agent-instruksjoner
7. **Arkivering:** Hetzner/Coolify/Vercel-referanser fjernes fra aktive dokumenter; `docs/SELF-HOSTED-SETUP.md` merkes som utdatet/arkivert.

---

## Consequences

### Positive

- **Entydig arbeidsflyt:** GitHub → Cloudflare Workers Builds → Edge Network.
- **Edge-latency:** Brukere får globalt lav latency uten ekstra CDN-konfigurasjon.
- **Kostnadskontroll:** Ingen Vercel/Hetzner/Coolify-utgifter for app-hosting.
- **Konsistent tooling:** Wrangler for deploy, secrets, logs og rollback.
- **Moderne caching:** R2/D1/DO gir ISR og tag-based revalidation i Worker-miljøet.

### Negative / tradeoffs

- **Vendor lock-in:** Dyp integrasjon med Cloudflare Workers API og bindings.
- **Runtime-grenser:** Worker har CPU-/minne-grenser; store synkrone initialiseringer må unngås.
- **Cold start:** Mindre relevant på Workers enn på tradisjonell Node.js, men store bundles kan påvirke første request.
- **Lokal utvikling:** `npm run dev` bruker fortsatt Next.js dev-server; `npm run cf:build` må brukes for å verifisere Worker-kompatibilitet.
- **GitHub Actions arkivert:** Kvalitetskontroller (lint, type-check, unit tests) kjøres nå via Husky pre-push hook, ikke CI. Dette krever disiplin hos utviklere.

---

## Migration Timeline

| Dato | Commit / Hendelse | Beskrivelse |
|---|---|---|
| 2026-06-21 | `9d5f3c46c` | Auto-deploy migrert fra GitHub Actions til Cloudflare Workers Builds |
| 2026-06-21 | `67873d968` | Cloudflare Workers Builds-migrering finalisert |
| 2026-06-21 | `de7af4c38` | Release-dokumentasjon oppdatert for Cloudflare Workers |
| 2026-06-25 | `3eb078498` | Vercel-affiliation fjernet fra runtime, scripts, docs og cron secret |
| 2026-06-25 | `a1f4a89ad` | Fjernet Vercel-rester |
| 2026-06-29 | `76a162fce` | Governance-dokumenter synkronisert med Cloudflare Workers |
| 2026-06-29 | `f1570c58e` / `1fa9f5896` | Repo-hygiene: fjernet utdaterte audit/debug/rapporter |

---

## Related Files

- `wrangler.jsonc` — Worker-konfigurasjon (routes, KV, bindings)
- `open-next.config.ts` — OpenNext.js Cloudflare overrides (R2/D1/DO)
- `package.json` — scripts: `cf:build`, `cf:deploy`, `cf:deploy:ci`
- `.kimi/WORKFLOW_RULES.md` — oppdatert arbeidsflyt
- `.kimi/EMERGENCY_PROD_FIX.md` — oppdatert nødprosedyre
- `docs/ARCHITECTURE.md` — oppdatert systemarkitektur
- `.kimi/KIMI.md` — oppdatert tech stack
- `.kimi/agents/klarpakke-architect-agent.md` — oppdatert hosting-fakta

---

## Verification Commands

```bash
# Sjekk faktisk runtime-konfigurasjon
cat wrangler.jsonc | head -20

# Sjekk siste deployments
npx wrangler deployments list

# Bygg for Cloudflare Workers
npm run cf:build

# Manuell deploy (kun backup)
npm run cf:deploy

# Sjekk produksjon
curl -I https://www.klarpakke.no/no
curl https://www.klarpakke.no/api/health
```

---

## Alternatives Considered

| Alternativ | Forkastet fordi |
|---|---|
| **Fortsette på Vercel** | Kostnad og ønske om mer kontroll over edge-runtime og caching. |
| **Fortsette på Hetzner + Coolify** | Selv-hostet Docker ga driftssvakhet; Cloudflare Workers gir bedre skalerbarhet og global edge. |
| **Fly.io** | Vurdert tidligere, men Cloudflare Workers valgt på grunn av tettere integrasjon med eksisterende Cloudflare DNS/CDN og D1/R2/KV-økosystem. |
| **Hybrid Vercel + Cloudflare** | Økt kompleksitet; full migrering gir enklere arkitektur og én kilde til sannhet. |

---

## Notes

- GitHub Actions workflows i `.github/workflows/` er **arkivert** (unntatt `purge-cache.yml` og `tool-updater.yml`).
- `.mcp-cache/` inneholder sensitive data og skal aldri committes.
- `.kimi/diary.jsonl` og `.mempalace/kg-append.jsonl` er autogenererte og skal ikke committes.
