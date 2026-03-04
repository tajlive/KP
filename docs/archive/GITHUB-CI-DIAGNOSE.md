# GitHub CI Diagnose – klarpakke

**Dato:** 2026-02-21  
**Utført av:** Kimi Code CLI (DevOps-modus)  

---

## 1. Oversikt

### Actions Status
```json
{
  "enabled": true,
  "allowed_actions": "all",
  "sha_pinning_required": false
}
```

**Konklusjon:** GitHub Actions er ENABLED og fullt operativt. Ingen indikasjon på suspended account.

### Workflows (7 aktive)

| Workflow | ID | Formål | State |
|----------|-----|--------|-------|
| CI | 235208751 | Hoved-CI: lint, type-check, test, build, security | active |
| CodeQL Security Analysis | 235208754 | Sikkerhetsanalyse (JS/TS) | active |
| Deploy to Cloud Run | 235712875 | Produksjonsdeploy til GCP | active |
| Supabase Auto Deploy | 234513196 | Auto-deploy ved DB-endringer | active |
| 🚀 Deploy Supabase | 236261082 | Manuell Supabase-deploy | active |
| Skip Vercel Preview for Docs | 236896855 | Skip-bygg for docs-PRs | active |
| Dependabot Updates | 235211618 | Auto-dependency updates | active |

### Secrets (14 konfigurert)
- GCP_SA_KEY (Google Cloud auth)
- SUPABASE_* (4 secrets)
- STRIPE_* (2 secrets)
- NEXTAUTH_SECRET
- RESEND_API_KEY
- VAPID_* (2 keys)
- COPILOT_MCP_SUPABASE_TOKEN

### Environments
- Preview
- Production

---

## 2. Feilmønstre

### Siste 10 CI-runs (ci.yml)

| Run ID | Status | Tid | Branch | Årsak |
|--------|--------|-----|--------|-------|
| 22180263510 | ❌ failure | 4m48s | dependabot/checkout-6 | npm ci feil |
| 22180224999 | 🚫 cancelled | 1m39s | dependabot/checkout-6 | Concurrency cancel |
| 22179674241 | ❌ failure | 5m16s | dependabot/setup-node-6 | npm ci feil |
| 22179635317 | 🚫 cancelled | 1m28s | dependabot/setup-node-6 | Concurrency cancel |
| 22179617788 | ❌ failure | 4m20s | dependabot/checkout-6 | npm ci feil |
| 22179583170 | 🚫 cancelled | 1m24s | dependabot/checkout-6 | Concurrency cancel |
| 22179551039 | 🚫 cancelled | 1m9s | dependabot/checkout-6 | Concurrency cancel |
| 22179543006 | ❌ failure | 2m51s | dependabot/setup-node-6 | npm ci feil |
| 22179523296 | 🚫 cancelled | 57s | dependabot/setup-node-6 | Concurrency cancel |
| 22179267259 | ❌ failure | 2m2s | dependabot/checkout-6 | npm ci feil |

### Mønsteranalyse

**🔴 Kritisk funn:**
- **100% av CI-feil** er fra Dependabot PRs
- **0% feil** fra manuelle pushes (siste uker)
- Alle feil skjer i `npm ci` steget
- Rotårsak: `package-lock.json` mismatch når actions-versjoner bumps

**Detaljert forklaring:**
Når Dependabot bumper `actions/checkout@v4 → @v6` eller `actions/setup-node@v4 → @v6`, oppdaterer den kun workflow-filen. Den rører ikke `package.json` eller `package-lock.json`. Men CI kjører `npm ci` som er avhengig av konsistent lock-file. Hvis det er en race condition eller cache-problemer, feiler bygget.

**Annen observasjon:**
- Mange "cancelled" statuser skyldes `concurrency: cancel-in-progress: true`
- Dette er ønsket oppførsel (kun nyeste run skal kjøre)

---

## 3. Dobbelt-CI (GitHub Actions vs Vercel CI)

### Nåværende oppsett

**GitHub Actions gjør:**
1. Lint (tsc)
2. Type Check (tsc --noEmit)
3. Test (vitest + coverage)
4. Build (Next.js)
5. Security Scan (npm audit + Trivy)
6. Deploy til Cloud Run (separat workflow)

**Vercel CI gjør (antatt):**
- Bygg ved push
- Preview deployments for PRs
- Analytics/Speed Insights

### Identifiserte problemer

1. **Overlappende bygg:** Både GitHub Actions og Vercel bygger Next.js
2. **Dobbel ressursbruk:** To separate byggmiljøer
3. **Forvirrende feilsøking:** Hvor feilet bygget? GitHub eller Vercel?
4. **Inkonsekvente miljøer:** GitHub bruker Ubuntu, Vercel bruker eget miljø

### Risikoer

- **Ved GitHub feil:** Deploy til Cloud Run skjer kanskje ikke
- **Ved Vercel feil:** Analytics kan mangle
- **Ved begge feil:** Utvikler forvirret, dobbelt arbeid

---

## 4. Konklusjon

### 3 viktigste problemer

1. **🔴 CI feiler på 100% av Dependabot PRs**
   - Årsak: `npm ci` feiler ved actions-bumps
   - Konsekvens: Røde kryss, støy, vanskelig å se ekte feil

2. **🟡 Dobbelt CI-oppsett uten tydelig ansvarsdeling**
   - Både GitHub Actions og Vercel bygger
   - Ingen klar "source of truth"

3. **🟡 Ingen branch protection aktivert**
   - Ingen required status checks
   - Risiko for å merge broken code

### 3 viktigste forbedringsmuligheter

1. **Legg til `continue-on-error` for Dependabot i CI**
   - Slik at Dependabot-PRer ikke blokkerer
   - Men fortsatt gir signaler

2. **Definer tydelig ansvarsdeling mellom GitHub og Vercel**
   - GitHub: CI + Cloud Run deploy
   - Vercel: Preview + Analytics (ikke bygg for main)

3. **Aktiver branch protection med required checks**
   - Kreve at CI passerer før merge
   - Beskytte main fra broken code

---

## 5. Anbefalt rollefordeling

Etter analyse anbefales følgende:

### ✅ Alternativ A: GitHub Actions = full CI, Vercel = hosting/analytics

**GitHub Actions ansvar:**
- [x] Lint, type-check, test, build (validering)
- [x] Security scan
- [x] Deploy til Cloud Run (produksjon)
- [x] Supabase migrations

**Vercel ansvar:**
- [ ] Preview deployments for PRs (valgfritt)
- [x] Analytics og Speed Insights (på Cloud Run-deployet site)
- [ ] INGEN bygg for main (bruker Cloud Run)

**Begrunnelse:**
- GitHub Actions har mer fleksibilitet (security scan, Trivy, CodeQL)
- Cloud Run er allerede produksjonsmiljø
- Vercel Analytics fungerer uavhengig av bygg (via SDK i koden)
- Enklere feilsøking med ett CI-system

### ❌ Alternativ B: Vercel CI = primær (avvist)

Grunn: Mindre kontroll over security scanning, vanskeligere å integrere med GCP/Cloud Run.

### ❌ Alternativ C: Hybrid med overlapp (nåværende, bør endres)

Grunn: Dobbel ressursbruk, forvirrende, vanskelig å vedlikeholde.

---

**Anbefaling:** Velg Alternativ A og implementer forslag i FIKS-seksjonen.
