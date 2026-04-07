# Linear Issues: UX Modernisering Q2 2026 - Gjenstående oppgaver

**EPIC:** UX Modernisering Q2 2026  
**EPIC ID:** KLA-UX-2026-Q2  
**Status:** Fase 1 ✅ | Fase 2 🔄 | Fase 3 ⏸️

---

## FASE 2: Strukturelle endringer

---

### KLA-237: Forenkle dashboard første-skjerm

**Type:** Feature  
**Priority:** High  
**Story Points:** 8  
**Assignee:** TBD  
**Labels:** `ux`, `dashboard`, `mobile`, `q2-2026`

#### Beskrivelse
Redesign dashboard-førsteskjerm for nybegynnere. Inspirert av Coinbase/Revolut - stor saldo øverst, én primær CTA, progressive disclosure for avanserte funksjoner.

#### Akseptkriterier
- [ ] Saldo vises stort og tydelig øverst (50% av viewport på mobil)
- [ ] Én primær CTA: "Start trading" eller "Se markedet"
- [ ] Avanserte funksjoner skjult bak "Mer" eller expand-knapp
- [ ] "Første handel"-prompt for nye brukere
- [ ] Slide-up panel for detaljer (ikke separate ruter)
- [ ] A/B-testet mot eksisterende CoinbaseHome

#### Tekniske detaljer
**Filer å endre:**
- `src/features/coinbase/CoinbaseHome.tsx` (refactor)
- `src/features/dashboard/DashboardContent.tsx`
- `src/features/dashboard/FirstTradeCard.tsx` (ny/oppdatert)

**Design tokens:**
- Bruk `SURFACE.BG` for bakgrunn
- `BRAND.gradient` for primær CTA
- `TYPOGRAPHY.hero` for saldo-størrelse

#### Avhengigheter
- Design-mockups fra UX-team
- A/B-test oppsett (Posthog)

#### Estimat
- Design: 2t
- Implementasjon: 4t
- Testing: 2t
- **Total: 8t**

---

### KLA-238: Konsolider profile/konto ruter

**Type:** Refactor  
**Priority:** Medium  
**Story Points:** 5  
**Assignee:** TBD  
**Labels:** `ux`, `nav`, `refactor`, `breaking-change`, `q2-2026`

#### Beskrivelse
Slå sammen overlappende ruter `/profile`, `/konto`, `/innstillinger` til én rute `/profile` med tabs: Profil, Lommebok, Innstillinger.

#### Akseptkriterier
- [ ] Ny rute: `/profile` med tabs
- [ ] Tabs: Profil | Lommebok | Innstillinger | Varsler
- [ ] Redirects: `/konto/*` → `/profile/wallet`
- [ ] Redirects: `/innstillinger/*` → `/profile/settings`
- [ ] Oppdater alle lenker i navigasjon
- [ ] Middleware redirect for gamle stier
- [ ] Oppdater `dashboard-links.ts`

#### Tekniske detaljer
**Nye filer:**
- `src/app/[locale]/(user)/profile/page.tsx`
- `src/features/profile/ProfileTabs.tsx`

**Filer å endre:**
- `src/lib/navigation/dashboard-links.ts`
- `src/middleware.ts` (legg til redirects)
- `src/shared/navigation/MobileMenu.tsx`
- `src/shared/navigation/TopNav.tsx`

**Database:**
- Ingen endringer nødvendig

#### Breaking changes
- URLs endres (krever redirects)
- Bookmarks til gamle stier må redirecte

#### Estimat
- Planlegging: 1t
- Implementasjon: 3t
- Testing + redirects: 1t
- **Total: 5t**

---

## FASE 3: Nye features

---

### KLA-239: Leaderboard-preview på landing

**Type:** Feature  
**Priority:** Medium  
**Story Points:** 5  
**Assignee:** TBD  
**Labels:** `konvertering`, `gamification`, `landing`, `q3-2026`

#### Beskrivelse
Vis topp 3 fra paper-trading med "Konkurrer om 50k KLT" CTA på landingssiden. Øker engasjement og konvertering.

#### Akseptkriterier
- [ ] Ny komponent: `LeaderboardPreview.tsx`
- [ ] Vis topp 3 brukere fra paper-trading
- [ ] Data: Brukernavn (anonymisert), avkastning %, KLT
- [ ] CTA: "Se full leaderboard" → `/konkurranse`
- [ ] Sekundær CTA: "Bli med" → `/register`
- [ ] Oppdateres daglig (cache 24t)
- [ ] Responsive: horizontal scroll på mobil

#### Tekniske detaljer
**Ny fil:**
- `src/features/landing/LeaderboardPreview.tsx`
- `src/lib/leaderboard/preview.ts` (data-fetching)

**Filer å endre:**
- `src/app/[locale]/page.tsx` (legg til komponent)

**Database query:**
```sql
SELECT username, paper_return_pct, klt_balance 
FROM user_leaderboard 
WHERE period = 'monthly' 
ORDER BY paper_return_pct DESC 
LIMIT 3;
```

**API:**
- Nytt endepunkt: `GET /api/leaderboard/preview`
- Cache: Redis/Edge Cache 24t

#### Avhengigheter
- `user_leaderboard` view/tabell
- API-endepunkt

#### Estimat
- Backend: 2t
- Frontend: 2t
- Testing: 1t
- **Total: 5t**

---

### KLA-240: KLT-teaser under hero

**Type:** Feature  
**Priority:** Medium  
**Story Points:** 2  
**Assignee:** TBD  
**Labels:** `konvertering`, `landing`, `klt`, `q3-2026`

#### Beskrivelse
En linje under hero: "Tjen KLT gjennom kurs og konkurranser - 50 000 KLT til månedens vinner" med lenke.

#### Akseptkriterier
- [ ] Ny komponent: `KLTTeaser.tsx`
- [ ] Plassering: Under HeroSection
- [ ] Innhold: "Tjen KLT gjennom kurs og konkurranser"
- [ ] Highlight: "50 000 KLT til månedens vinner"
- [ ] Lenke: "Lær mer om KLT" → `/klt` eller `/kurs`
- [ ] Styling: Inline med ikon (Coins fra Lucide)
- [ ] Animasjon: Subtle pulse på KLT-tallet

#### Tekniske detaljer
**Ny fil:**
- `src/features/landing/KLTTeaser.tsx`

**Filer å endre:**
- `src/app/[locale]/page.tsx`

**Design:**
- Tekststørrelse: `text-lg`
- Farge: `text-slate-300` + `text-brand-400` for highlight
- Ikon: `<Coins className="w-5 h-5" />`

#### Estimat
- Implementasjon: 1t
- Testing: 1t
- **Total: 2t**

---

### KLA-241: Dynamisk brukertall fra DB

**Type:** Feature  
**Priority:** Low  
**Story Points:** 3  
**Assignee:** TBD  
**Labels:** `konvertering`, `landing`, `trust`, `q3-2026`

#### Beskrivelse
Erstatt hardkodet "10 000+ brukere" med faktisk count fra Supabase. Øker troverdighet.

#### Akseptkriterier
- [ ] API-endepunkt: `GET /api/stats/users`
- [ ] Returnerer: `{ count: number, lastUpdated: string }`
- [ ] Cache: 1 time (ISR eller Redis)
- [ ] Viser: "{count} studenter lærer trading"
- [ ] Fallback: Hardkodet tall hvis API feiler
- [ ] Formatering: `10.2k` for store tall

#### Tekniske detaljer
**Ny fil:**
- `src/app/api/stats/users/route.ts`

**Filer å endre:**
- `src/features/landing/TrustStrip.tsx` (oppdater stat cards)

**Database:**
```sql
SELECT COUNT(*) as total_users 
FROM profiles 
WHERE created_at > NOW() - INTERVAL '90 days';
```

**Cache:**
- Next.js ISR: `revalidate: 3600`
- Eller: Upstash Redis

#### Estimat
- Backend: 1t
- Frontend: 1t
- Testing: 1t
- **Total: 3t**

---

### KLA-242: Mikro-læring i dashboard

**Type:** Feature  
**Priority:** Medium  
**Story Points:** 13  
**Assignee:** TBD  
**Labels:** `ux`, `læring`, `dashboard`, `q3-2026`

#### Beskrivelse
Tooltips/inline hints på dashboard for førstegangsbrukere. Revolut Stories-inspirert. Context-aware tips basert på brukerens aktivitet.

#### Akseptkriterier
- [ ] Onboarding-tour for første besøk
- [ ] Context-aware tooltips:
  - Ikke handlet ennå? → "Start med lekepenger"
  - Har handlet 1-3 ganger? → "Prøv auto-trade"
  - Har auto-trade? → "Utforsk AI-analyse"
- [ ] Progress-bar for "Første steg"
- [ ] Dismissable tips (lagres i localStorage)
- [ ] Analytics: Hvilke tips klikkes mest?
- [ ] Mobile: Bottom sheet istedenfor tooltips

#### Tekniske detaljer
**Nye filer:**
- `src/features/onboarding/MicroLearning.tsx`
- `src/features/onboarding/ProgressSteps.tsx`
- `src/lib/onboarding/tips.ts` (tip-definisjoner)
- `src/hooks/useOnboardingProgress.ts`

**Filer å endre:**
- `src/features/coinbase/CoinbaseHome.tsx`
- `src/features/dashboard/DashboardClientLayout.tsx`

**Data-modell:**
```typescript
interface OnboardingTip {
  id: string;
  condition: (user: User) => boolean;
  title: string;
  description: string;
  cta: { label: string; href: string };
  priority: number;
}
```

**Lagring:**
- `localStorage`: `kp_onboarding_dismissed`, `kp_onboarding_completed`
- Database: `user_onboarding_progress` (valgfritt)

#### Avhengigheter
- User analytics/events
- A/B-test rammeverk

#### Estimat
- Design: 3t
- Frontend: 6t
- Testing: 2t
- Analytics: 2t
- **Total: 13t**

---

### KLA-243: Glass-morfisme konsistent

**Type:** Design-debt  
**Priority:** Low  
**Story Points:** 5  
**Assignee:** TBD  
**Labels:** `design-debt`, `tokens`, `ui`, `q3-2026`

#### Beskrivelse
Definer glass-nivå i tokens og bruk konsistent på alle kort. Forenkle og standardisere glass-morfisme.

#### Akseptkriterier
- [ ] Nytt token: `SURFACE.glass` (3 nivåer)
  - `glassLow`: `bg-white/[0.03] border-white/[0.05]`
  - `glassMedium`: `bg-white/[0.05] border-white/[0.08]`
  - `glassHigh`: `bg-white/[0.08] border-white/[0.12]`
- [ ] Oppdater alle kort:
  - `GlassCard.tsx`
  - `StrategyCard.tsx`
  - `PremiumPanel.tsx`
  - etc.
- [ ] Fjern hardkodede glass-verdier
- [ ] Dokumentasjon i Storybook

#### Tekniske detaljer
**Filer å endre:**
- `src/lib/design/tokens.ts` (legg til SURFACE.glass)
- `src/shared/ui/GlassCard.tsx`
- `src/features/strategies/StrategyCard.tsx`
- `src/features/trading/PremiumTradingLayout.tsx`

**Eksempel:**
```typescript
export const SURFACE = {
  // ... eksisterende
  glass: {
    low: "bg-white/[0.03] backdrop-blur-md border border-white/[0.05]",
    medium: "bg-white/[0.05] backdrop-blur-xl border border-white/[0.08]",
    high: "bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12]",
  },
};
```

#### Estimat
- Token-definisjon: 1t
- Refactor komponenter: 3t
- Testing: 1t
- **Total: 5t**

---

## Sprint-planlegging

### Sprint A (2 uker): Konvertering-fokus
- KLA-240: KLT-teaser (2t)
- KLA-241: Dynamisk brukertall (3t)
- KLA-239: Leaderboard-preview (5t)
- **Buffer: 2t**

### Sprint B (2 uker): Dashboard-forbedring
- KLA-238: Profile/konto konsolidering (5t)
- KLA-243: Glass-morfisme (5t)
- **Buffer: 3t**

### Sprint C (3 uker): Store features
- KLA-237: Dashboard forenkling (8t)
- **Eller:** KLA-242: Mikro-læring (13t)

---

## Ressurser

### Design
- Figma: `Klarpakke-UX-2026-Q2`
- Design tokens: `src/lib/design/tokens.ts`

### Dokumentasjon
- EPIC: `docs/LINEAR-EPIC-UX-2026.md`
- Konkurrentanalyse: `docs/design-konkurranse-analyse-2026.md`

### Verktøy
- A/B-testing: Posthog
- Analytics: Posthog + Vercel Analytics
- Utvikling: `npm run kimi_ci` for sjekk

---

**Generert:** 2026-04-07  
**Ansvarlig:** KIMI CLI
