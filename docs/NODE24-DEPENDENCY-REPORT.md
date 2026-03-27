# Node.js 24.x Dependency Report
> Generert: 2026-03-27
> Gjelder: Klarpakke produksjonsmiljø

## Sammendrag

| Kategori | Status |
|----------|--------|
| Kjerne-Node 24-kompatibilitet | ✅ OK |
| Kritiske runtime-avhengigheter | ✅ OK |
| Dev/test-avhengigheter | ✅ OK |
| Anbefalte oppgraderinger | 🟡 2 pakker |

---

## Kritiske pakker - Node 24-kompatibilitet

### ✅ Kjernerammeverk (OK)

| Pakke | Versjon | Node 24 | Kommentar |
|-------|---------|---------|-----------|
| `next` | ^15.5.13 | ✅ Støttet | Next.js 15 krever Node 18.17+, full støtte for 24.x |
| `@sentry/nextjs` | ^10.42.0 | ✅ Støttet | Sentry SDK støtter Node 18+ |
| `@sentry/react` | ^10.42.0 | ✅ Støttet | Browser SDK, Node-uavhengig |

### ✅ Database & Backend (OK)

| Pakke | Versjon | Node 24 | Kommentar |
|-------|---------|---------|-----------|
| `@supabase/supabase-js` | ^2.99.2 | ✅ Støttet | JS SDK, Node-agnostisk |
| `@supabase/ssr` | ^0.9.0 | ✅ Støttet | Server-side SDK, Node 18+ |
| `pg` | ^8.19.0 | ✅ Støttet | PostgreSQL driver, Node 14+ |

### ✅ Testing (OK)

| Pakke | Versjon | Node 24 | Kommentar |
|-------|---------|---------|-----------|
| `@playwright/test` | ^1.58.2 | ✅ Støttet | Krever Node 18+, 24.x OK |
| `vitest` | ^4.0.18 | ✅ Støttet | Krever Node 18+, 24.x OK |
| `@vitest/coverage-v8` | ^4.0.18 | ✅ Støttet | Samme som vitest |

### ✅ Vercel/Cloudflare (OK)

| Pakke | Versjon | Node 24 | Kommentar |
|-------|---------|---------|-----------|
| `@vercel/analytics` | ^1.6.1 | ✅ Støttet | Vercel-offisiell |
| `@vercel/speed-insights` | ^1.3.1 | ✅ Støttet | Vercel-offisiell |

> **Merk:** `wrangler` er ikke i package.json (brukes kun via npx i scripts).

---

## Anbefalte oppgraderinger

### 🟡 @types/node (^20.19.35 → ^24.x)

**Årsak:** DevDependency for TypeScript-typene til Node. Bør matche runtime.

**Risiko:** Lav. Kun type-definisjoner, påvirker ikke runtime.

**Kommando:**
```bash
npm install -D @types/node@^24.0.0
```

**Tidsfrist:** Før neste major release av Klarpakke.

### 🟡 ts-node (^10.9.2 → ^11.x eller erstatte med tsx)

**Årsak:** ts-node har historisk hatt forsinket støtte for nye Node-versjoner.

**Status:** 10.9.2 fungerer med Node 24, men ny major er tilgjengelig.

**Alternativ:** Vurder å migrere til `tsx` for raskere kjøring:
```bash
npm uninstall ts-node
npm install -D tsx
```

**Tidsfrist:** Ikke kritisk. Kan vente til vedlikeholdsvindu.

---

## Sikkerhetsvurdering

| Pakke | CVE-sjekk | Kommentar |
|-------|-----------|-----------|
| All dependencies | ✅ Ingen kjente kritiske | `npm audit` kjøres ukentlig |
| Node 24 runtime | ✅ LTS-track | Planlagt LTS i oktober 2026 |

---

## Oppsummering

**Konklusjon:** Alle kritiske avhengigheter er kompatible med Node.js 24.x. Ingen umiddelbare tiltak nødvendig.

**Anbefalinger:**
1. ✅ Behold nåværende pakkeversjoner (stabilt)
2. 🟡 Oppgrader `@types/node` i neste vedlikeholdsvindu
3. 🟡 Vurder ts-node → tsx migrasjon ved behov

**Siste verifisering:** 2026-03-27
**Neste gjennomgang:** 2026-04-27
