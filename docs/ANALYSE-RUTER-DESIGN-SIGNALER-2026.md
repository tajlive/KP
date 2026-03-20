# Full analyse: Ruter, lenker, design og signaler – mars 2026

**Formål:** Samlet vurdering av dupliserte sider, ødelagte lenker, designkonsistens og trading-signaler.

---

## 1. Ødelagte lenker (404 / feil URL)

### 1.1 `/leaderboard` – Finnes ikke

- **Lokalisering:** `KLTWallet.tsx`, `MonthlyCompetitionBanner.tsx`, sitemap, e-postmaler (`leaderboard_climb`)
- **Status:** Ingen `src/app/[locale]/leaderboard/page.tsx`
- **Effekt:** Alle lenker til leaderboard gir 404

### 1.2 `/leagues` – Finnes ikke

- **Lokalisering:** Sitemap, middleware (PROTECTED_PATHS), auth-guard
- **Status:** Ingen `src/app/[locale]/leagues/page.tsx`
- **Effekt:** 404 ved direkte navigasjon; beskyttet path som ikke har en side

### 1.3 `/varsler/innstillinger` – Finnes ikke

- **Lokalisering:** `NotificationBell.tsx` linje 100
- **Status:** Finnes `varsler/page.tsx`, men ikke `varsler/innstillinger/page.tsx`
- **Effekt:** "Innstillinger"-lenke i varsel-dropdown gir 404

### 1.3 Lenker uten locale-prefix

| Komponent             | Linje  | Feil                                   | Bør være                                  |
| --------------------- | ------ | -------------------------------------- | ----------------------------------------- |
| `CopyTradingCard.tsx` | 198    | `href="/dashboard?connect=binance"`    | `/${locale}/dashboard?connect=binance`    |
| `CopyTradingCard.tsx` | 266    | `href="/copy-trading"`                 | `/${locale}/copy-trading`                 |
| `SignalFeed.tsx`      | 293    | `href="/no/priser"`                    | `/${locale}/priser`                       |
| `CookieConsent.tsx`   | 32     | `href="/personvern"`                   | `/${locale}/personvern` (eller canonical) |
| `MinimalFooter.tsx`   | 23, 29 | `href="/personvern"`, `href="/vilkar"` | Locale-prefix                             |
| `PulseEventFeed.tsx`  | 91     | `href={/kurs/${slug}}`                 | `/${locale}/kurs/${slug}`                 |

### 1.4 Sitemap – feil URL-er

- **Sjekk:** `src/app/sitemap.ts` lister `/en/courses`, `/en/calculator`, `/en/about`, `/en/contact`, `/en/privacy`, `/en/terms`
- **Faktisk routing:** Appen bruker samme path for alle locales: `/kurs`, `/kalkulator`, `/om-oss`, `/kontakt`, `/personvern`, `/vilkar`
- **Konklusjon:** For `localePrefix: as-needed` og default `no`, blir norske sider `/path`, engelske `/en/path`. Sitemap bør derfor bruke `/en/kurs`, `/en/kalkulator` osv., ikke `/en/courses`.

---

## 2. Dupliserte / overlappende sider

### 2.1 Auth

| Route                | Eksisterer                    | Merknad        |
| -------------------- | ----------------------------- | -------------- |
| `/login`             | Ja (redirect → `/innlogging`) | OK             |
| `/innlogging`        | Ja                            | Kanonisk       |
| `/(auth)/innlogging` | Ja                            | Samme innhold  |
| `/signup`            | Ja                            | Kanonisk       |
| `/registrer`         | Ja (redirect → `/signup`)     | OK             |
| `/glemt-passord`     | Ja                            | Kanonisk       |
| `/reset-password`    | Ja                            | Mulig duplikat |

### 2.2 Trading

| Route                         | Formål                      | Overlap                      |
| ----------------------------- | --------------------------- | ---------------------------- |
| `/paper-trading`              | Oversikt / liste            | –                            |
| `/paper-trading/[session_id]` | Enkelt paper-session        | OK                           |
| `/auto-trading`               | Informasjonsside / landing  | Kan forveksles med dashboard |
| `/auto-trading-ai`            | Egen AI-side                | Overlappende konsept         |
| `/dashboard/auto-trade`       | Faktisk auto-trade UI       | Burde være hovedinngang      |
| `/live-trading`               | Live trading UI             | –                            |
| `/beta/live-trading`          | Redirects til paper-trading | Legacy, OK                   |

### 2.3 Læring / kurs

| Route                                                 | Merknad                                       |
| ----------------------------------------------------- | --------------------------------------------- |
| `/kurs`                                               | Hovedkursoversikt                             |
| `/kurs/[moduleSlug]`                                  | Modul                                         |
| `/kurs/[moduleSlug]/leksjon/[lessonSlug]`             | Leksjon (dynamisk)                            |
| `/kurs/grunnleggende/leksjon/introduksjon-til-krypto` | Hardkodet leksjon                             |
| `/kurs/strategi/leksjon/dollar-cost-averaging`        | Hardkodet leksjon                             |
| `/leksjon/[lessonId]`                                 | **Alternativ leksjon-struktur** – forvirrende |
| `/akademi`                                            | Egen læringsseksjon – overlap med `/kurs`     |
| `/akademi/dashboard-guide`                            | Spesifikk guide                               |

### 2.4 Innstillinger

| Route                      | Merknad                        |
| -------------------------- | ------------------------------ |
| `/innstillinger`           | Hovedinnstillinger (beskyttet) |
| `/dashboard/innstillinger` | Dashboard-innstillinger        |
| `/dashboard/settings`      | Engelsk alternativ – overlap   |

---

## 3. Døde knapper / manglende handlinger

### 3.1 LiveSignalFeed – "Se alle historiske signaler"

- **Fil:** `src/components/landing/LiveSignalFeed.tsx` linje 154–156
- **Problem:** `<button>` uten `href`, `onClick` eller `Link` – gjør ingenting
- **Forslag:** Lenke til `/signaler` eller dedikert signal-side, eller fjern knappen

### 3.2 BotStatusDashboard – "Se alle detaljer", "Se statistikk"

- `showSuccess("general.comingSoon")` – ikke implementert

---

## 4. Design – svakheter

### 4.1 Allerede dokumentert i `design-assessment-2026.md`

- Emoji-ikoner på priser (🎓 📈 🏆 🎯)
- Standard AI-hero-gradient (blue/indigo/emerald)
- Design-tokens brukes ikke overalt
- Tabeller: mangler `tabular-nums`, tydelig rad-hover
- For lite mikro-interaksjon og dybde

### 4.2 Flere observasjoner

- **To nav-komponenter:** `LandingNavigation` vs `MarketingNavigation` med ulike lenker:
  - LandingNavigation: kurs, paper-trading, priser (ingen auto-trading)
  - MarketingNavigation: kurs, paper-trading, **auto-trading**, priser
- **UnifiedTradingDashboard:** Bruker emoji i overskrifter (`📄 Lekepenger`, `💰 Live Handel`) – ikke tokens
- **LiveSignalFeed:** Lys styling (`bg-slate-50/50`, `bg-white`) i konflikt med mørkt tema på landing
- **SignalFeed:** `href="/no/priser"` hardkodet – bør bruke `useLocale()`

---

## 5. Signaler for tradere

### 5.1 Hvor signaler vises

| Komponent        | Plassering                                     | Tilgang           |
| ---------------- | ---------------------------------------------- | ----------------- |
| `SignalFeed`     | `UnifiedTradingDashboard` (paper-trading/live) | Krever innlogging |
| `LiveSignalFeed` | Landing (via `landing/index`)                  | Offentlig         |
| `SignalTable`    | **Brukes ikke i appen**                        | Ikke plassert     |

### 5.2 Tilgangsnivå

- **Master/PhD/Professor:** Full tilgang (stop loss, target, AI-begrunnelse)
- **Student/Bachelor:** Begrenset visning + oppgraderingsbanner
- **Landing:** FALLBACK_SIGNALS hvis `trading_signals` er tom eller feiler

### 5.3 Mangler for tradere

1. **Dedikert signal-side:** Ingen `/signaler` eller `/trading-signals` – brukere finner signal kun i paper-trading-dashboard
2. **"Se alle historiske signaler":** Knappen i LiveSignalFeed gjør ingenting
3. **SignalTable:** Komponent finnes men brukes ikke
4. **Ingen tydelig signal-CTA på dashboard:** AIMarketBrief vises, men ikke et eget "Dagens signaler"-panel med direkte handling

---

## 6. Prioriteringer

### P0 (kritisk)

| #   | Tiltak                                                                                          |
| --- | ----------------------------------------------------------------------------------------------- |
| 1   | Opprett `/leaderboard`-side ELLER fjern alle lenker til leaderboard                             |
| 2   | Opprett `/varsler/innstillinger` ELLER endre NotificationBell til eksisterende innstillingsside |
| 3   | Fiks CopyTradingCard (`/dashboard`, `/copy-trading`) – legg til locale                          |
| 4   | Fiks PulseEventFeed – legg til locale i kurs-lenker                                             |

### P1 (høy)

| #   | Tiltak                                                                  |
| --- | ----------------------------------------------------------------------- |
| 5   | Fiks SignalFeed `href="/no/priser"` → bruk `useLocale()`                |
| 6   | LiveSignalFeed: Implementer "Se alle" eller fjern knappen               |
| 7   | Konsistent navigasjon: Én nav-struktur (Landing vs Marketing)           |
| 8   | Sitemap: Korriger en-ruter (`/en/kurs` i stedet for `/en/courses` osv.) |

### P2 (medium)

| #   | Tiltak                                                                              |
| --- | ----------------------------------------------------------------------------------- |
| 9   | SignalTable: Enten plasser på en side (f.eks. `/signaler`) eller fjern              |
| 10  | Reduser overlap: `/auto-trading` vs `/dashboard/auto-trade` – tydelig hovedinngang  |
| 11  | Forenkle leksjon-routing: `/leksjon/[lessonId]` vs `/kurs/.../leksjon/[lessonSlug]` |
| 12  | Erstatt emoji med Lucide-ikoner (priser, UnifiedTradingDashboard)                   |

### P3 (lav)

| #   | Tiltak                                            |
| --- | ------------------------------------------------- |
| 13  | CookieConsent og MinimalFooter – locale på lenker |
| 14  | Design-tokens konsekvent i hele appen             |
| 15  | Dedikert signal-side for tradere med tydelig CTA  |

---

## 7. Sammendrag

| Kategori                        | Status | Antall funn                             |
| ------------------------------- | ------ | --------------------------------------- |
| Ødelagte lenker                 | 🔴     | 2 (leaderboard, varsler/innstillinger)  |
| Lenker uten locale              | 🟠     | 6+ forekomster                          |
| Dupliserte/overlappende sider   | 🟠     | 10+ ruter                               |
| Døde knapper                    | 🟠     | 1 (LiveSignalFeed "Se alle")            |
| Design – ikke i tråd med tokens | 🟡     | Flere komponenter                       |
| Signaler – manglende tilbud     | 🟡     | Ingen dedikert side, SignalTable ubrukt |

**Anbefaling:** Start med P0 – leaderboard og varsler/innstillinger samt fiks av locale på kritiske lenker. Deretter P1 for signaler og navigasjon.

---

_Sist oppdatert: mars 2026_
