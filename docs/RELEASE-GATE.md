# Release Gate – P0 Kriterier

> Dokument for KLA-PROFIT1 og fremtidige P0-releases

---

## 📋 P0 Release Gates

For at en P0-feature skal merges til `main` og deployes til produksjon, må følgende gates passeres:

### Gate 1: Kodekvalitet (Automatisk via CI)

**Workflow:** `.github/workflows/merge-ready.yml`

| Job ID | Display Name | Verktøy | Krav |
|--------|--------------|---------|------|
| `type-check` | ⌨️ Type Check | `tsc --noEmit` | 0 errors, strict mode |
| `lint` | 🔍 Lint | ESLint | 0 errors, 0 warnings |
| `unit-tests` | 🧪 Unit Tests | Vitest | 100% pass rate |
| `build` | 🏗️ Build | Next.js | 0 errors, alle sider genereres |
| `e2e-tests` | 🎭 E2E Tests | Playwright | Kritiske stier grønne |

**Merk:** Disse er separate parallelle/sekvensielle jobs. Hver job kjører uavhengig, men **merge blokkeres når én required check feiler**, selv om andre jobs fortsatt kan fullføre. Build og E2E Tests avhenger av at Type Check og Lint er grønne først.

### Gate 2: Feature Completeness (Manuell)
- [ ] Alle AC i Linear-issue er oppfylt
- [ ] Code review godkjent av minst 1 senior utvikler (CODEOWNERS trigget)
- [ ] Dokumentasjon oppdatert (hvis relevant)
- [ ] Ingen kjente kritiske bugs

### Gate 3: Infrastruktur (Automatisk/Manuell)
- [ ] Edge Functions deploybar (hvis relevant)
- [ ] Database-migrasjoner validert
- [ ] Env-variabler konfigurert i Vercel/Supabase
- [ ] Monitorering på plass (Sentry alerts)

### Gate 4: Sikkerhet (Manuell)
- [ ] Ingen hardkodede secrets
- [ ] RLS-policyer på plass for nye tabeller
- [ ] API-endepunkter har riktig auth
- [ ] `verify_jwt` eksplisitt satt (Edge Functions)

---

## 🔒 GitHub Branch Protection (Admin Setup)

**Viktig:** GitHub Teams er **ikke påkrevd**. CODEOWNERS fungerer fullt ut med individuelle brukere.

### Settings → Branches → Add rule (main)

- [ ] **Require a pull request before merging**
  - [ ] **Require approvals:** Minimum 1
  - [ ] **Dismiss stale PR approvals when new commits are pushed**
  - [ ] **Require review from CODEOWNERS**

- [ ] **Require status checks to pass before merging**
  - [ ] **Require branches to be up to date before merging**
  
  **Search for and select checks (job IDs):**
  - [x] `type-check`
  - [x] `lint`
  - [x] `unit-tests`
  - [x] `build`
  - [x] `e2e-tests`

- [ ] **Require conversation resolution before merging**

- [ ] **Block force pushes**

**Merk:** Inkluder ikke "Include administrators" hvis du vil unngå bypass.

---

## 🔗 Required Status Checks (Eksakt liste)

Kopier denne listen inn i GitHub Branch Protection UI:

```
type-check
lint
unit-tests
build
e2e-tests
```

**VIKTIG:** Bruk `job-id`, ikke display name (name:). 
- ✅ Riktig: `type-check`
- ❌ Feil: `⌨️ Type Check`

---

## ✅ Verifisering (Pre-Flight Checklist)

**Status:** CODEOWNERS fallback implementert – krever manuelt GitHub-oppsett  
**Siste oppdatering:** 2026-04-02  

---

### 🔴 KRITISK: Manuell oppsett påkrevd

#### 1. CODEOWNERS Fallback (Implementert)

Siden GitHub Teams-status er ukjent, er fallback til individuelle brukere implementert:

**Nåværende:**
```
* @tajlive
/src/app/**/*.tsx @tajlive
/supabase/**/*.sql @tajlive
```

**TODO etter merge:** Opprett teams og revert til team-basert CODEOWNERS.

#### 2. Branch Protection – Manuell aktivering påkrevd

**Repo Admin må gjøre følgende i GitHub UI:**

1. Gå til Settings → Branches
2. Add rule for `main`
3. Konfigurer som dokumentert i "🔒 GitHub Branch Protection (Admin Setup)" ovenfor
4. VIKTIG: Søk etter og legg til alle 5 required checks

#### 3. Live PR Verifisering (MÅ gjøres)

| Sjekkpunkt | Metode | Status |
|------------|--------|--------|
| Push `feat/ai-profit-max` | `git push origin feat/ai-profit-max` | ⏳ |
| Opprett PR mot `main` | GitHub UI | ⏳ |
| 5 checks dukker opp | PR → Checks tab | ⏳ |
| CODEOWNERS trigget | @tajlive assigned | ⏳ |
| Merge blokkert uten approval | Grå merge-knapp | ⏳ |
| Merge blokkert ved rød check | Rød X, ingen merge | ⏳ |
| Dismiss stale approvals | Ny commit → approval fjernet | ⏳ |

**Verifisert av:** _________________  
**Dato/tid:** _________________  
**Resultat:** ⏳ PENDING

---

### Fallback hvis GitHub Teams mangler

| Scenario | Løsning |
|----------|---------|
| Teams finnes ikke | CODEOWNERS er allerede endret til @tajlive |
| Team opprettes senere | Revert CODEOWNERS til team-navn |
| Enkeltbruker skal endres | Endre @tajlive til annen bruker i CODEOWNERS |

---

## 🔄 Rollback-Kriterier

### Automatisk Rollback (hvis implementert)
| Scenario | Trigger | Aksjon |
|----------|---------|--------|
| Health check feiler | 3x 500 på /api/health | Alert + vurder rollback |
| Error rate > 5% | Sentry alert | Umiddelbar rollback |
| Deploy feiler | Vercel/Supabase | Automatisk abort |

### Manuell Rollback
**Hvem kan trigge:** Platform Engineer, Tech Lead, eller Delivery Owner

**Scenarioer:**
1. **Kritisk funksjonalitet ødelagt**
   - Påmelding fungerer ikke
   - Betaling feiler
   - Auth er brutt

2. **Data-integritet truet**
   - Feil i DB-migrasjon
   - Duplikate transaksjoner
   - Manglende RLS

3. **Performance-degradering**
   - Page load > 5s
   - API-respons > 10s
   - Memory leaks

**Rollback-prosedyre:**
1. Verifiser at rollback er nødvendig (ikke panikk)
2. Trigg Vercel rollback til forrige deployment
3. Varsle team i #incidents
4. Opprett Linear-issue for post-mortem
5. Kommuniser til brukere hvis nødvendig

---

## 👥 Godkjennere & CODEOWNERS

### CODEOWNERS Mappet (`.github/CODEOWNERS`)

| Path | Owner | Beskrivelse |
|------|-------|-------------|
| `src/app/**/*.tsx` | @klarpakke/frontend-leads | Next.js pages |
| `src/features/**/*.tsx` | @klarpakke/frontend-leads | React komponenter |
| `src/app/**/route.ts` | @klarpakke/backend-leads | API routes |
| `src/lib/**/*.ts` | @klarpakke/backend-leads | Backend utilities |
| `supabase/**/*.sql` | @klarpakke/backend-leads | Database |
| `supabase/functions/**/*.ts` | @klarpakke/backend-leads | Edge Functions |
| `.github/workflows/*.yml` | @klarpakke/platform | CI/CD |
| `e2e/**/*.ts` | @klarpakke/qa-leads @klarpakke/frontend-leads | E2E tester |

### KLA-PROFIT1 (AI Profit Metrics) Spesifikke

| Rolle | Person/Team | Ansvar |
|-------|-------------|--------|
| **Tech Lead** | @klarpakke/tech-leads | Arkitektur-godkjenning |
| **Senior Backend** | @klarpakke/backend-leads | API/Edge Function review |
| **Senior Frontend** | @klarpakke/frontend-leads | Dashboard/React review |
| **Platform Engineer** | @klarpakke/platform | CI/CD, deploy-verifikasjon |
| **QA Lead** | @klarpakke/qa-leads | E2E test review |
| **Delivery Owner** | @klarpakke/delivery | Release-beslutning |

### Merge Godkjenning
- **Minst 1 av:** Tech Lead, Senior Backend, eller Senior Frontend
- **Required:** Platform Engineer (for CI/CD-aspekt)
- **CODEOWNERS enforced:** Ja (via GitHub Branch Protection)
- **Final:** Delivery Owner gir GO for merge

---

## 📁 KLA-PROFIT1 Spesifikke Sjekkpunkter

### Pre-Merge (lokalt)
```bash
# Kjør full sjekk
npm run check:merge-ready

# Verifiser spesifikke KLA-PROFIT1-komponenter
npm run test:e2e:metrics
```

### Post-Merge (automatisk)
1. **Merge Ready workflow** triggeres på PR
2. Ved grønn CI: Merge mulig (hvis også manuell review OK)
3. Ved merge til main:
   - Vercel deploy starter
   - Edge Function deploy starter (hvis supabase/functions/** endret)
   - Slack-notifikasjon ved suksess/feil

### Post-Deploy Verifikasjon
- [ ] `/no/dashboard/metrics` laster uten hydration errors
- [ ] `/api/ai/ensemble` returnerer 200 med gyldig signal
- [ ] Edge Function `ensemble-signals` svarer på GET
- [ ] Sentry viser ingen nye 500-errors

---

## 🚨 Escalation Path

```
Problem oppdaget
       ↓
Er det kritisk? (P0)
       ↓
   JA → Umiddelbar rollback
   ↓      ↓
   NEI → Fix forward
   ↓
Opprett Linear-issue
   ↓
Post-mortem innen 24h (hvis kritisk)
```

### Kontakter (KLA-PROFIT1)
- **On-call Platform:** @klarpakke/platform-oncall
- **Tech Lead:** @klarpakke/tech-leads
- **Delivery Owner:** @klarpakke/delivery
- **Slack:** #incidents

---

## 📝 Endringslogg

| Dato | Versjon | Endring | Ansvarlig |
|------|---------|---------|-----------|
| 2026-04-02 | 1.0 | Initial release gate for KLA-PROFIT1 | Platform Team |
| 2026-04-02 | 1.1 | Lagt til eksakte required status checks og GitHub UI sjekkliste | Platform Team |
| 2026-04-02 | 1.2 | Oppdatert CODEOWNERS med team mappings | Platform Team |

---

## 🔗 Relaterte Dokumenter

- [KLA-PROFIT1 Linear Update](./KLA-PROFIT1-LINEAR-UPDATE.md)
- [AGENTS.md](../AGENTS.md) – Utviklings-standarder
- [GitHub Setup](../.github/GITHUB_SETUP.md) – CI/CD detaljer
- [CODEOWNERS](../.github/CODEOWNERS) – Review assignments
