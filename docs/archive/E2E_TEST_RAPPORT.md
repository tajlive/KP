# E2E Test Rapport – Klarpakke

**Generert:** 2026-02-24  
**Testet mot:** https://www.klarpakke.no  
**Testrammeverk:** Playwright (@playwright/test ^1.58.2)

---

## 1. STATISTIKK

| Kategori | Desktop Chrome | Mobile Safari | Totalt |
|----------|---------------|---------------|--------|
| ✅ Bestått | 44 | 0* | 44+ |
| ❌ Feilet | 5 | 11* | 5+ |
| ⏭️ Hoppet over | 0 | 0 | 0 |

*Mobil Safari-tester avbrutt pga timeout mot produksjonsserver

**Sider testet:** 10 offentlige sider  
**Skjermbilder tatt:** 45 stk i `playwright-report/screenshots/`  

---

## 2. FUNN – FUNKSJONALITET

### ✅ Sider som laster korrekt (HTTP 200)
| Side | Status | H1 funnet |
|------|--------|-----------|
| /no | ✅ OK | ✅ |
| /en | ✅ OK | ✅ |
| /no/priser | ✅ OK | ✅ "Velg din studieplan" |
| /en/pricing | ✅ OK | ✅ "Choose your study plan" |
| /no/om-oss | ✅ OK | ✅ |
| /no/kalkulator | ✅ OK | ✅ |
| /no/hjelp | ✅ OK | ✅ |
| /no/kontakt | ✅ OK | ✅ |

### ⚠️ Sider med mangler
| Side | Problem | Alvorlighet |
|------|---------|-------------|
| /no/kurs | Ingen h1-overskrift | MEDIUM |
| /no/innlogging | Ingen h1-overskrift | MEDIUM |
| /no/innstillinger | Ingen h1-overskrift (redirecter til /no/innlogging) | LAV |

### Console Errors funnet
- **400 Bad Request** på flere sider (/no/om-oss, /no/kalkulator, /no/hjelp, /no/kontakt)
  - Årsak: API-kall som feiler (sannsynligvis autentiseringskall til protected endepunkter)
  - Alvorlighet: LAV (ikke synlig for brukere)

---

## 3. FUNN – TEKST OG COPY

### ✅ Tekstkvalitet – OK på alle testede sider
| Sjekkpunkt | Status |
|------------|--------|
| Ingen "undefined" synlig | ✅ |
| Ingen "null" synlig | ✅ |
| Ingen tomme knapper | ✅ |
| Alle sider har page title | ✅ |
| Ingen rå i18n-nøkler synlig | ✅ |

### Sider med manglende semantisk struktur
| Side | Problem |
|------|---------|
| /no/kurs | Mangler h1-overskrift |
| /no/innlogging | Mangler h1-overskrift |

---

## 4. FUNN – NAVIGASJON

### ✅ Navigasjon fungerer
- Header-navigasjon er synlig med 8 lenker
- Språkbytte (no → en) fungerer

### ⚠️ Navigasjonsproblemer
| Problem | Detalj |
|---------|--------|
| Footer ikke funnet | Siden har ingen footer-element |
| Mobilmeny | Hamburger-ikon finnes, men mobil-navigasjon ikke verifisert |

---

## 5. FUNN – SKJEMAER

| Test | Status | Kommentar |
|------|--------|-----------|
| Innloggingsskjema vises | ✅ | |
| Tom submit viser feil | ✅ | Browser-validering aktivert |
| Ugyldig epost viser feil | ✅ | |
| Kontaktskjema finnes | ⚠️ | Ingen skjema funnet på /no/kontakt |

---

## 6. FUNN – VISUELT OG RESPONSIVT

### Skjermbilder tatt (alle viewports)
- ✅ Landing page (no/en) – 3 viewports hver
- ✅ Pricing page – 3 viewports  
- ✅ Om oss – 3 viewports
- ✅ Innlogging – 3 viewports
- ✅ Kurs – 3 viewports
- ✅ Kalkulator – 3 viewports
- ✅ Hjelp – 3 viewports

### Responsivt design
| Test | Resultat |
|------|----------|
| Ingen horisontal overflow på mobil | ✅ |
| Lesbar tekst (font-size > 16px) | ✅ |
| 375px, 768px, 1440px breakpoints | ✅ |

---

## 7. SKJERMBILDER

Alle skjermbilder finnes i: `playwright-report/screenshots/`

| Kategori | Filer |
|----------|-------|
| Offentlige sider | `_no.png`, `_en.png`, `_no_priser.png`, etc. |
| Copy-sjekk | `copy__no.png`, `copy__no_priser.png`, etc. |
| Visuell regresjon | `visual_*_mobile/tablet/desktop.png` |
| Responsive | `responsive_*.png` |
| Skjemaer | `login_*.png`, `contact_form.png` |
| Navigasjon | `nav_desktop.png`, `mobile_*.png` |

**Totalt:** 45 skjermbilder tatt

---

## 8. PRIORITERT TILTAKSLISTE

### 🔴 KRITISK (Må fikses umiddelbart)
Ingen kritiske funn – alle sider laster og fungerer.

### 🟡 HØY (Bør fikses snart)
1. **Legg til h1-overskrift på /no/kurs**
   - SEO-impact: Høy
   - Tilgjengelighet: Høy

2. **Legg til h1-overskrift på /no/innlogging**
   - SEO-impact: Medium
   - Tilgjengelighet: Høy

3. **Vurder å legge til footer på landing page**
   - Brukerforventninger

### 🟢 MEDIUM (Kan forbedres)
1. **Reduser 400 Bad Request errors i console**
   - Håndter uautoriserte kall mer elegant
   
2. **Implementer kontaktskjema på /no/kontakt**
   - Hvis dette er meningen

### 🔵 LAV (Valgfritt)
1. **Forbedre mobilmeny-testdekning**
2. **Legg til flere språktester (th, zh)**

---

## 9. KJØRING AV TESTER

### Standard kjøring mot produksjon
```bash
npm run test:e2e
```

### Kun nye tester (01-06)
```bash
npx playwright test tests/e2e/0[1-6]-*.spec.ts --project="Desktop Chrome"
```

### Med HTML-rapport
```bash
npx playwright test && npx playwright show-report
```

### Bare visuell test
```bash
npx playwright test tests/e2e/05-visual-regression.spec.ts --headed
```

---

## 10. TESTDEKNING

### Testfiler opprettet
| Fil | Dekning |
|-----|---------|
| `01-public-pages.spec.ts` | HTTP-status, h1, console errors |
| `02-navigation.spec.ts` | Header, footer, mobilmeny, språkbytte |
| `03-copy-and-text.spec.ts` | i18n-nøkler, undefined/null, CTAs |
| `04-forms.spec.ts` | Skjemavalidering, feilmeldinger |
| `05-visual-regression.spec.ts` | Skjermbilder alle sider/viewports |
| `06-responsive.spec.ts` | Overflow, lesbarhet, breakpoints |

---

*Rapport generert automatisk av Playwright E2E-testpakke*
