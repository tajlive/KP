# E2E Test Suite — Playwright + Lighthouse + Allure

## Oversikt

Komplett test-suite for Klarpakke som fanger krasj FØR produksjon.

## Komponenter

### 1. Playwright E2E (e2e/smoke/all-pages.spec.ts)

**20 tester** — verifiserer at ALLE sider laster uten krasj:

| Kategori | Sider | Forventet status |
|---|---|---|
| Offentlige | /, /priser, /kurs, /om-oss, /login, /register | 200 |
| Trading | /trade (+ 5 moduser) | 200 eller 307→login |
| Dashboard | /dashboard/* (4 sider) | 200 eller 307→login |
| Profil | /profile | 200 eller 307→login |
| Backcompat | /pilot, /jokertrade | 307→/trade |

**Hva den fanger:**
- HTTP-feil (500, 404)
- Krasj-indikatorer ("Application error", "Something went wrong")
- Tomme sider (body < 100 tegn)
- Kritiske JS-feil i console (filtrert: font, analytics, sentry, favicon, preload)

**Kjør:**
```bash
npm run test:e2e:all-pages
```

### 2. Lighthouse (e2e/smoke/lighthouse.spec.ts)

**3 tester** — ytelse og tilgjengelighet:

| Side | Performance | A11y | Best Practices | SEO |
|---|---|---|---|---|
| Landing | 82 | 96 | 100 | 92 |
| Trade | 99 | 89 | 100 | 92 |
| Dashboard | 99 | 89 | 100 | 92 |

**Terskler:**
- Performance: ≥ 75 (flaky på kalde Workers — retry gir +6)
- Accessibility: ≥ 88 (Trade/Dashboard scorer 89)
- Best Practices: ≥ 85
- SEO: ≥ 90

**Kjør:**
```bash
npm run test:e2e:lighthouse
```

### 3. Allure-rapporter

Genererer HTML-rapport med screenshots, video og traces:

```bash
npm run test:e2e:full          # Kjør begge suiter
npm run allure:generate        # Generer rapport
npm run allure:serve           # Åpne i browser
```

## Pre-commit hook

`.husky/pre-commit` kjører E2E smoke-test automatisk ved endringer i:
- `src/features/trading/`
- `src/features/dashboard/`
- `src/app/[locale]/`

Blokkerer commit hvis noen side krasjer.

## Fallgruver

### 1. Auth-barriere (307 redirect)

Sider som krever innlogging redirecter til `/login`. Tester må:
- Akseptere 307/302/401/403 som gyldig
- Sjekke `page.url().includes("/login")` før de asserter på innhold
- Skippe innholds-sjekker på login-siden (den er alltid OK)

### 2. Krasj-indikatorer må være spesifikke

"500" matcher "5000 KLT" på landingssiden. Bruk "500 Internal Server Error".

### 3. Lighthouse flaky på kalde Workers

Første kjøring etter deploy: performance 79. Retry: 85. Terskel 75 (ikke 80).

### 4. Kritiske funksjoner krever auth

Tester som verifiserer "alle 5 moduser synlige" må skippes hvis ikke innlogget:
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto("/trade");
  if (page.url().includes("/login")) {
    test.skip(true, "Krever innlogging");
  }
});
```

## Når skal denne kjøres?

| Hendelse | Kommando |
|---|---|
| Før commit (UI-endringer) | Automatisk via pre-commit |
| Etter deploy | `npm run test:e2e:all-pages` |
| Ukentlig ytelse | `npm run test:e2e:lighthouse` |
| Før release | `npm run test:e2e:full` + Allure-rapport |

## Integrasjon med eksisterende QA

Denne suiten erstatter IKKE manuell visuell testing (se `klarpakke-qa` SKILL.md). Den fanger:
- Krasj (500, 404, tomme sider)
- Ytelse-regresjoner
- Manglende moduser/features

Manuell testing fanger fortsatt:
- Visuelle bugs (layout, farger, overlap)
- Brukerflyt-problemer
- i18n-konsistens
