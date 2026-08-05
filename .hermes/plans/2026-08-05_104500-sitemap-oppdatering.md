# Sitemap Oppdatering — Implementation Plan

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen oppgave-for-oppgave.

**Mål:** Oppdatere sitemap etter superplan-endringer (fjernede sider, nye redirects).

**Nåværende kontekst:**
- `src/app/sitemap.ts` finnes og er godt bygget (dynamisk, force-dynamic for Cloudflare)
- Automatisk oppdagelse av ruter fra filesystem
- Ekskluderer private grupper: (user), (admin), (onboarding), (commerce)
- Ekskluderer paths: debug, dev, feil, studio, admin
- 12 sider ble slettet i superplan Fase 1 — disse må nå 301-redirectes
- Sanity CMS-sider inkluderes automatisk

**Tech Stack:** Next.js 16 MetadataRoute, Cloudflare Workers, Sanity CMS

---

## Task 1: Verifiser eksisterende sitemap

**Mål:** Sjekke at sitemap.ts ikke har døde lenker etter superplan-endringer.

**Filer:**
- Les: `src/app/sitemap.ts`

**Sjekkliste:**
- [ ] Ingen slettede sider i sitemap (about, bots, mobiloversikt, etc.)
- [ ] Ingen /trade (kun /handel)
- [ ] Ingen admin-sider (ekskludert via EXCLUDED_GROUPS)
- [ ] Ingen onboarding-sider (ekskludert)

**Kommando:**
```bash
curl -s https://www.klarpakke.no/sitemap.xml | grep -E "(about|bots|mobiloversikt|trade|admin)" | head -10
```

**Forventet:** Ingen treff (eller kun /handel, ikke /trade)

---

## Task 2: Oppdater priority for endrede sider

**Mål:** Gi riktig priority til nye viktige sider.

**Filer:**
- Modify: `src/app/sitemap.ts:130-160`

**Endringer:**
```typescript
// FØR:
if (path === "priser" || path === "copy-trading" || path === "handel") {
  return { path, priority: 0.9, changeFrequency: "weekly" };
}

// ETTER:
if (path === "priser" || path === "handel" || path === "dashboard") {
  return { path, priority: 0.9, changeFrequency: "weekly" };
}
```

**Begrunnelse:** `/dashboard` er nå hovedinngangen for innloggede brukere.

---

## Task 3: Legg til redirects for slettede sider

**Mål:** 301 redirects for SEO (ikke i sitemap, men i next.config).

**Filer:**
- Modify: `next.config.ts` eller `src/middleware.ts`

**Redirects:**
```typescript
// next.config.ts
async redirects() {
  return [
    { source: "/trade", destination: "/handel", permanent: true },
    { source: "/about", destination: "/om-oss", permanent: true },
    { source: "/bots", destination: "/handel", permanent: true },
    { source: "/mobiloversikt", destination: "/", permanent: true },
    { source: "/velg-strategi", destination: "/onboarding", permanent: true },
    { source: "/velkommen", destination: "/onboarding", permanent: true },
    { source: "/admin/v2", destination: "/admin", permanent: true },
    { source: "/admin/v3", destination: "/admin", permanent: true },
    { source: "/admin/deploy", destination: "/admin", permanent: true },
  ];
}
```

**Merk:** Disse er ikke i sitemap, men viktige for SEO og brukere med bokmerker.

---

## Task 4: Verifiser i18n-alternates

**Mål:** Sjekke at alle språk er med i sitemap.

**Filer:**
- Les: `src/app/sitemap.ts:239-262`

**Sjekk:**
- [ ] "no" (norsk) — default
- [ ] "en" (engelsk)
- [ ] "x-default" — peker til norsk
- [ ] th/zh? (hvis aktivert)

**Kommando:**
```bash
curl -s https://www.klarpakke.no/sitemap.xml | grep -o 'hreflang="[^"]*"' | sort | uniq -c
```

**Forventet:** 3 språk (no, en, x-default)

---

## Task 5: Test og deploy

**Kommandoer:**
```bash
# Lokal test
npm run build
npx next build

# Sjekk generert sitemap
cat .next/server/app/sitemap.xml | head -50

# Deploy
bash scripts/deploy.sh

# Verifiser live
curl -s https://www.klarpakke.no/sitemap.xml | wc -l
curl -s https://www.klarpakke.no/sitemap.xml | grep -c "url>"
```

---

## Risikoer

| Risiko | Mitigering |
|--------|------------|
| Sitemap for stor (>50MB) | Cloudflare Workers har grenser — sjekk størrelse |
| Sanity CMS nede | Sitemap har fallback (stille) |
| Redirect-loop | Test alle redirects før deploy |

---

## Verifisering

1. `curl -s https://www.klarpakke.no/sitemap.xml | grep -c "url>"` — tell antall URLs
2. `curl -s https://www.klarpakke.no/sitemap.xml | grep -E "(about|bots|trade)"` — skal ikke finne slettede sider
3. `curl -sI https://www.klarpakke.no/about` — skal gi 301 til /om-oss
4. Google Search Console — sjekk for crawl-errors etter 24t
