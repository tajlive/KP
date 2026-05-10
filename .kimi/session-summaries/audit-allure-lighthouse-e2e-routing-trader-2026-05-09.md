# Komplett Audit — Allure, Lighthouse, e2e, Routing, Trader

**Dato:** 2026-05-09  
**Utført av:** KIMI Super Agent  
**Status:** GO ✅ — Kritisk API-feil fikset, resten dokumentert

---

## Fase 1: Allure-analyse (357 test-resultater)

| Status | Antall | % |
|--------|--------|---|
| ✅ Pass | 101 | 28% |
| ❌ Fail | 249 | 70% |
| ⏭️ Skip | 1 | <1% |
| 🔨 Broken | 1 | <1% |

### Feil-kategorier (ranked)
| Kategori | Antall | % av feil | Årsak |
|----------|--------|-----------|-------|
| Missing Browser | 168 | 67% | Playwright webkit/Chrome ikke installert |
| Assertion/Content | 63 | 25% | Tomt innhold (0 bytes), elementer ikke synlige |
| Assertion | 12 | 5% | Generelle expect-feil |
| API HTML Error | 4 | 2% | `Unexpected token '<'` — API returnerer HTML |
| Timeout | 2 | 1% | Klikk-timeout 30s |

### Anbefalinger
1. Kjør `npx playwright install` for å fikse 168 feil
2. Dashboard-sider returnerer 0 bytes i test-miljø — sjekk auth state
3. API HTML Error (4 stk) er **NÅ FIKSET** (se Fase 5)

---

## Fase 2: Lighthouse — PC vs Mobil

### Homepage (`/no`)
| Metrikk | Desktop | Mobil | Gap |
|---------|---------|-------|-----|
| **Performance** | 89 | **53** | -36 poeng 🔴 |
| LCP | 1.9s | **5.7s** | 3× tregere |
| FCP | 0.6s | **2.7s** | 4.5× tregere |
| TBT | 0ms | **810ms** | Ekstremt 🔴 |
| Speed Index | 1.7s | **4.7s** | 2.8× tregere |
| Interactive | 1.9s | **7.9s** | 4× tregere |
| A11y | 92 | 92 | ✅ |
| Best Practices | 92 | 92 | ✅ |
| SEO | 85 | 85 | ⚠️ |

### Mobil-problemer
- **142 KiB unused JavaScript** blokkerer hovedtråden (TBT: 810ms)
- Total bundle: 1,119 KiB (vs 909 KiB desktop)
- Action items: Code splitting, defer non-critical JS

### Eksisterende rapporter (`.lighthouseci/`)
| Side | Desktop Perf | A11y | SEO |
|------|-------------|------|-----|
| `/no` | 94 | 91 | 92 |
| `/no/priser` | 96 | 96 | 92 |
| `/no/login` | 100 | 92 | 92 |

### Mangler
- ❌ Ingen **Mac/Safari** Lighthouse-rapport
- ❌ Ingen **mobil** Lighthouse i CI (kun desktop)

---

## Fase 3: e2e Audit per Enhet

### Playwright-prosjekter
| Enhet | Prosjekt | Status |
|-------|----------|--------|
| PC Chrome | smoke, critical, regression, a11y, user-flows, responsive, performance | ✅ |
| PC Firefox | critical-firefox | ✅ |
| Mac Safari | **MANGLER** — ingen desktop webkit | ❌ |
| iOS | mobile-safari (iPhone 13), landing-mobile (iPhone SE), a11y-mobile | ✅ |
| Android | mobile-chrome (Pixel 5) | ✅ |

### Andre funn
- 48 spec-filer, **3 duplikater**: `critical-flows.spec.ts` (×2), `paper-trading.spec.ts` (×2), `launch-critical.spec.ts` (×2)
- Ingen `setup.ts` auth-state caching for mobil-prosjekter (alle avhenger av `setup`)

### Anbefalinger
1. Legg til `macos-webkit` prosjekt: `{ name: 'macos-webkit', use: { ...devices['Desktop Safari'] } }`
2. Fjern duplikate spec-filer
3. Kjør `npx playwright install webkit` for Mac-testing

---

## Fase 4: Routing / Tekster / Tall / Prosenter

### Routing
- ✅ 16/16 kritiske paths fungerer (verifisert i produksjon)
- ✅ Security headers tilstede
- ✅ `/api/health` responderer 200

### Tekster (i18n)
- ✅ Kun `no` + `en` aktive (th/zh avvent)
- ⚠️ `seo-audit.json` i `.lighthouseci/` kan sjekke meta-beskrivelser

### Tall / Prosenter
- ✅ `toLocaleString()` brukes for NOK-format
- ✅ `Number.toFixed(2)` for prosenter

### Fikset under audit
| Problem | Før | Etter |
|---------|-----|-------|
| Footer color contrast | `text-white/20`, `text-white/40` | **TODO** — ikke fikset ennå |
| Touch target size | For liten hero-knapp | **TODO** — ikke fikset ennå |

### Gjenstående a11y-oppgaver
1. Footer: `text-white/20` → `text-white/60` (4 Lighthouse-varsler)
2. Hero touch target: minst 48×48px (1 Lighthouse-varsel)

---

## Fase 5: Trader-feil — `tomarnejensen@gmail.com`

### Symptom
> "Kunne ikke laste posisjon. Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

### Root Cause Analysis
```
PositionLotsCard → fetch("/api/trading/position")
    ↓
i18nMiddleware redirecter /api/trading/position → /no/api/trading/position (307)
    ↓
Next.js App Router finner INGEN API-route på /no/api/trading/position
    ↓
Returnerer HTML (Next.js fallback/error page)
    ↓
JSON.parse() feiler på HTML → "Unexpected token '<'"
```

### Impact
- **75 filer** gjør `fetch("/api/...")` uten locale-prefix
- **4 Allure-tester** feiler med samme årsak
- **Alle brukere** påvirket (ikke bare tomarnejensen@gmail.com)

### Fix
```diff
// src/middleware/i18n.ts
- if (pathname.startsWith("/auth/") || pathname === "/login" || pathname === "/register")
+ if (pathname.startsWith("/auth/") || pathname.startsWith("/api/") || pathname === "/login" || pathname === "/register")
```

**Commit:** `2e65ed2e5`

---

## Oppsummering

| Fase | Status | Kritisk? |
|------|--------|----------|
| Allure-analyse | ✅ Rapport ferdig | — |
| Lighthouse mobil | ✅ Gap dokumentert (53 vs 89) | Medium |
| e2e per enhet | ✅ Mac/Safari-gap identifisert | Medium |
| Routing/tekster | ✅ 2 a11y-oppgaver gjenstår | Lav |
| Trader API-feil | ✅ **FIKSET** | **🔴 Kritisk** |

### Neste steg (anbefalt)
1. **Deploy fikset** (`2e65ed2e5`) til produksjon — løser API-feil for alle brukere
2. Kjør `npx playwright install webkit` + legg til `macos-webkit` prosjekt
3. Fiks footer color contrast (`text-white/20` → `text-white/60`)
4. Reduser unused JS på landing page (142 KiB)
5. Legg til mobil Lighthouse i CI
