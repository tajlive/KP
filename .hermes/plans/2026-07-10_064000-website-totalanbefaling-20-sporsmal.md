# Klarpakke Nettside — Totalanbefaling 2026

> **Hermes:** Plan-modus. 20 klikkbare spørsmål for videre optimalisering.

**Status:** 40+ ruter, 34 E2E-tester, 12 helsesjekker, CoinGecko fallback, dark glassmorphism.

---

## 🎯 Overordnet vurdering

| Område | Score | Kommentar |
|--------|:-----:|-----------|
| **Infrastruktur** | ⭐⭐⭐⭐⭐ | Enterprise CI/CD, auto-healing, 24/7 pg_cron |
| **Testdekning** | ⭐⭐⭐⭐ | 34 E2E + 34 a11y + 160 unit. Mangler visual regression |
| **Design/UX** | ⭐⭐⭐ | Dark theme OK, men inkonsistent spacing/animation |
| **Ytelse** | ⭐⭐⭐ | Lighthouse CI finnes men kjører kun ved merge |
| **SEO** | ⭐⭐ | Ingen meta, ingen sitemap, ingen schema.org |
| **Konvertering** | ⭐⭐ | Ingen analytics, ingen A/B-testing, ingen onboarding-optimalisering |
| **Tilgjengelighet** | ⭐⭐⭐ | 34 WCAG-tester men kun critical sjekkes |
| **Content** | ⭐⭐ | Ingen blogg, ingen case studies, ingen vitnemål |

---

## 20 Klikkbare Spørsmål

### 🔴 KRITISK (P0) — Gjør dette først

#### 1. "Fiks 'unhealthy' produksjon — hva feiler?"
Prod returnerer `unhealthy` akkurat nå. Diagnostiser og fiks.
> `/api/health` → sjekk alle 12 komponenter → rapporter hva som feiler

#### 2. "Aktiver Lighthouse CI på ALLE sider (ikke bare landing)"
I dag: Lighthouse kjører kun ved merge, kun på utvalgte sider.
> Legg til `npx lighthouse-ci` for alle 25 offentlige ruter i CI

#### 3. "Legg til SEO: sitemap.xml + meta-tags + schema.org"
Ingen SEO er gjort. Legg til:
> - Dynamisk `sitemap.xml` med alle ruter (allerede i kode?)
> - Meta-beskrivelser (`metadata` export i hver page.tsx)
> - Schema.org: `WebApplication`, `EducationalOrganization`

#### 4. "Fiks mobil-opplevelse: test ALLE sider i 375px viewport"
70% av brukere er på mobil. Mange sider har overflow/horisontal scroll.
> Kjør Playwright på 375px viewport for alle 40 ruter, rapporter feil

#### 5. "Sett opp Google Analytics / Plausible for sanntids brukerdata"
Ingen analytics. Vi vet ikke hvor mange som besøker, hvor de kommer fra, hva de gjør.
> Legg til Plausible (GDPR-vennlig, selv-hostet) eller Google Analytics 4

---

### 🟠 VIKTIG (P1) — Gjør dette denne uken

#### 6. "Optimaliser Landing Page for konvertering"
Landing page er det første besøkende ser. Må konvertere til signup.
> - A/B-test: Hero heading (2 varianter)
> - Legg til sosial bevis (antall tradere, total profit)
> - CTA over fold (synlig uten scrolling)

#### 7. "Bygg onboarding-flyt: 3 steg fra signup til første trade"
Ny bruker → onboarding → paper trading → første profit.
> - Steg 1: Velg erfaringsnivå (nybegynner/erfaren)
> - Steg 2: Sett paper balance (10K/50K/100K)
> - Steg 3: Første trade med veiledning (tooltips)

#### 8. "Lag interaktiv demo på landingssiden (ingen signup kreves)"
La besøkende prøve paper trading UTEN å registrere seg.
> - 30-sekunders demo: "Se hvor enkelt det er"
> - Anonym session med 10 000 kr paper balance
> - "Likte du dette? Registrer deg for å fortsette"

#### 9. "Optimaliser JokerTrade-siden til å bli hovedattraksjonen"
JokerTrade er unikt — ingen andre norske plattformer har AI-drevet trading.
> - Hero-seksjon med live demo
> - "Hva er JokerTrade?" — forklaringsvideo (30 sek)
> - Live leaderboard-widget på JokerTrade-siden
> - "Start JokerTrade nå" — prominent CTA

#### 10. "Legg til gamification: achievements, streaks, badges"
Ingen gamification. Brukere trenger insentiver til å fortsette.
> - "7 dagers streak" badge
> - "Første profit" achievement
> - "Topp 10% trader" badge
> - Leaderboard med ukentlige premier

#### 11. "Bygg notification-system: push + email"
Ingen notifikasjoner. Brukere vet ikke når ting skjer.
> - Push-notifikasjon: "Din trade ga +500 kr profit!"
> - E-post: Ukentlig oppsummering av portefølje
> - In-app: Live-feed av trades (allerede bygget i LiveFeed)

#### 12. "Lag course/badge-system for læring"
Klarpakke er en "skole" men har ingen kurs-struktur.
> - 3 kurs: Nybegynner, Middels, Avansert
> - Hvert kurs: 5-10 leksjoner (video + quiz)
> - Fullført kurs = badge på profilen

---

### 🟡 NICE-TO-HAVE (P2) — Gjør dette denne måneden

#### 13. "Bygg referral-program: 'Få en venn til å trade, få 5 000 kr paper bonus'"
Viral vekst via eksisterende brukere.
> - Unik referral-link per bruker
> - Belønning: paper bonus + badge
> - Leaderboard: "Flest inviterte denne måneden"

#### 14. "Lag dark mode switcher + lagre preferanse"
Dark mode er default, men la brukere velge.
> - Toggle i header/settings
> - Lagre i user_profiles / localStorage

#### 15. "Optimaliser alle bilder: next/image + WebP + lazy loading"
Mange bilder lastes uten optimalisering.
> - Konverter alle PNG til WebP
> - Legg til `priority` på hero-bilder
> - `loading="lazy"` på below-fold

#### 16. "Sett opp error boundaries per route"
I dag: global error boundary. Bør være per side for bedre UX.
> - `error.tsx` i hver route group
> - Custom feilmeldinger per side
> - "Prøv igjen" knapp på alle error boundaries

#### 17. "Legg til 'Sist oppdatert' og changelog på alle sider"
Tillitsskapende. Viser at plattformen er aktiv.
> - Footer: "Sist oppdatert: 10. juli 2026"
> - `/changelog` side
> - Versjonsnummer i footer

#### 18. "Bygg mørk/laptop-mode PWA (installerbar web-app)"
Gjør Klarpakke til en installerbar app på mobil.
> - `manifest.json`
> - Service worker for offline-støtte
> - "Legg til på hjemskjerm"-prompt

#### 19. "Lag API-dokumentasjon for utviklere"
Hvis Klarpakke skal ha et API for tredjeparter.
> - `/docs/api` side
> - OpenAPI/Swagger spec
> - Eksempler på integrasjon

#### 20. "Sett opp A/B-testing rammeverk for kontinuerlig forbedring"
Eksperimenter for å optimalisere konvertering.
> - GrowthBook eller LaunchDarkly
> - A/B-test landing page hero (2 varianter)
> - Mål: konvertering til signup

---

## 📊 Prioritering

```
NÅ (i dag):        1, 2, 3, 4, 5
DENNE UKEN:        6, 7, 8, 9, 10, 11, 12
DENNE MÅNEDEN:     13, 14, 15, 16, 17, 18, 19, 20
```

## ⚡ Quick wins (under 5 min hver)

- **#1:** Diagnostiser `/api/health` → fiks det som feiler
- **#4:** Kjør mobil-viewport test → se hva som brekker
- **#17:** Legg til versjonsnummer i footer

## 🚀 Størst impact

- **#8:** Interaktiv demo → umiddelbar verdi uten signup
- **#10:** Gamification → beholder eksisterende brukere
- **#13:** Referral → viral vekst
