# Plan: Én trading-side (alt 1) + tydelig UX

**Mål:** Én inngang til all trading (`/paper-trading`) med tydelig skille mellom øving (paper) og ekte penger (live), og konsistent navigasjon.

---

## 1. Nåværende tilstand

| Element                    | Status                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Én URL**                 | `/dashboard/trading` og `/live-trading` redirecter til `/paper-trading` (henholdsvis uten og med `?mode=live`).               |
| **Session-detalj**         | `/paper-trading/[session_id]` viser én session; `trading_sessions.mode` er `paper` eller `live`.                              |
| **Liste-side**             | `/paper-trading` (innlogget) viser kun **paper**-sessions og bruker `PaperTradingList` direkte.                               |
| **PaperTradingPageClient** | Finnes med `?view=sessions` (liste) vs default (UnifiedTradingDashboard) og `?mode=live` – brukes **ikke** av page.tsx i dag. |
| **Lenker til live**        | Noen steder peker fortsatt på `/live-trading` eller `/live-trading/[id]` (sistnevnte finnes ikke som rute → 404).             |

---

## 2. Prinsipper (alt 1 + tydelig UX)

1. **Én trading-side:** All brukeropplevelse for «handle» går via `/paper-trading` (ev. med query-params).
2. **Tydelig modus:** Paper = øving/lekepenger (grønn/sikker), Live = ekte penger (rød/tydelig advarsel). Alltid synlig i header/banner eller tab.
3. **Én session-URL:** Session-detalj er alltid `/paper-trading/[session_id]`; visning (paper/live) styres av `session.mode` og ev. `?mode=live` for konsistens.
4. **Ingen doble ruter:** Ingen egen `/live-trading/[session_id]` – alt under `/paper-trading`.

---

## 3. Konkrete tiltak

### 3.1 Bruk én client-wrapper på trading-siden

- **Nå:** `paper-trading/page.tsx` rendrer `PaperTradingList` direkte og ignorerer `searchParams.mode` og `searchParams.view`.
- **Tiltak:** La `paper-trading/page.tsx` (innlogget) bruke `PaperTradingPageClient` med:
  - `sessions` (paper-sessions for liste-visning),
  - `balance`, `locale`, `userId`, `contextBannerText`,
  - slik at klienten leser `?view=sessions` og `?mode=live` og velger:
    - **Default (`view !== 'sessions'`):** `UnifiedTradingDashboard` med `initialMode` fra `?mode=live` (tydelig UX: dashboard med paper/live-tab eller banner).
    - **`?view=sessions`:** Session-liste (som i dag) med modus-banner (paper vs live) basert på `?mode=live`.

Dermed blir `/paper-trading` = oversikt/dashboard, og `/paper-trading?view=sessions` = «Mine øvingssesjoner»; `/paper-trading?mode=live` = samme oversikt med live-modus tydelig satt.

### 3.2 Tydelig modus i UI

- **UnifiedTradingDashboard:** Sørg for at `initialMode` (fra URL) alltid reflekteres synlig:
  - Enten en tydelig tab/knapp «Øving» vs «Live» (med farge: grønn vs rød),
  - Eller en fast banner under header: «Øving – 100 000 kr lekepenger» vs «Live – ekte penger».
- **PaperTradingPageClient:** Banner (når `view=sessions`) er allerede forskjellig for paper vs live – behold dette.
- **Session-detalj:** På `/paper-trading/[session_id]` hent `session.mode` og vis tilsvarende banner/label (paper vs live) slik at bruker alltid ser om det er øving eller ekte penger.

### 3.3 Én session-URL – fjern avhengighet av /live-trading/[id]

- **BotStatusCard:** I dag: live-session → `/live-trading/${session.id}` (ruten finnes ikke → 404). Endre til: `/paper-trading/${session.id}` (ev. med `?mode=live` for konsistens). Samme lenke for paper: `/paper-trading/${session.id}`.
- **Andre lenker:** Erstatt alle lenker til `/live-trading` med `/paper-trading?mode=live`, og alle `/live-trading/[id]` med `/paper-trading/[id]` (ev. `?mode=live` hvis ønsket for kontekst).
- **Onboarding/CTA:** F.eks. `OnboardingCompletion` og `OnboardingFlow` som sender til «live-trading»: endre til `router.push(\`/${locale}/paper-trading?mode=live\`)` (med locale der det er aktuelt).

### 3.4 Dashboard-guide og andre pekere

- **dashboard/guide:** Lenken til «trading» peker på `/${locale}/dashboard/trading` – det redirecter allerede til `/paper-trading`. For tydelig UX kan lenketeksten være «Handle / Trading» og href fortsatt `dashboard/trading` (redirect) eller direkte `/paper-trading`.
- **ConditionalFooter:** Har `/live-trading` i listen – kan byttes til `/paper-trading` (ev. med `?mode=live` i copy der det er relevant).
- **Portfolio/beta:** Lenker til `beta/live-trading` – vurder om disse skal peke på `paper-trading?mode=live` for konsistens, eller behold beta-rute inntil beta fjernes.

### 3.5 Middleware og tier-gate

- **Middleware:** `/paper-trading` er ubeskyttet (teaser for uinnloggede); innlogget får full side. Behold dette.
- **tier-gate:** I dag: `{ path: '/live-trading', minLevel: 1 }`. Når alt går via `/paper-trading`, bør live-tilgang gjerne gated på **innhold** (f.eks. når bruker velger «Live» eller åpner en live-session), ikke på path. Ev. sjekk tier ved:
  - Navigasjon til `paper-trading?mode=live`, eller
  - Åpning av en session med `mode=live`.
    Slik at én path `/paper-trading` kan både vise paper (alle) og live (tier-gated).

### 3.6 Nav/sidebar

- **DashboardSidebar:** «Handle» peker allerede på `/paper-trading` – beholde.
- **DashboardTabs:** «Practice» → `/paper-trading` – beholde.
- Unngå å introdusere to menypunkter («Paper» vs «Live»); heller én «Handle» som åpner `/paper-trading`, der modus velges tydelig inne på siden.

---

## 4. Sjekkliste implementering

- [x] **Page client:** Koble `paper-trading/page.tsx` (innlogget) til `PaperTradingPageClient` med nødvendige props (sessions, balance, locale, userId, contextBannerText).
- [x] **URL-parametre:** Klient leser `?view=sessions` og `?mode=live`; default view = dashboard (UnifiedTradingDashboard).
- [x] **Modus i dashboard:** Tydelig tab eller banner i UnifiedTradingDashboard for paper vs live; initialMode fra URL; toggle med grønn (paper) / rød (live); URL synkes med modus.
- [x] **Session-detalj:** Tydelig paper vs live-banner/label på `/paper-trading/[session_id]` basert på `session.mode`.
- [x] **BotStatusCard:** Endre live-session lenke fra `/live-trading/${id}` til `/paper-trading/${id}` (ev. `?mode=live`).
- [x] **OnboardingCompletion / OnboardingFlow:** Redirect til `/paper-trading?mode=live` (med locale) i stedet for `/live-trading`.
- [x] **ConditionalFooter / andre lenker:** Erstatt `/live-trading` med `/paper-trading` (footer skjules på `/paper-trading`).
- [x] **Tier-gate:** Flytt live-sjekk fra path `/live-trading` til `/paper-trading` med `?mode=live`; oppdater tier-gate med requireQuery.
- [ ] **i18n:** Tekster for «Øving» / «Live» og ev. «Mine sesjoner» vs «Trading-oversikt» der nødvendig (valgfritt).
- [ ] **Smoke-test:** Klikk «Handle» → `/paper-trading`; bytt til live (tab/knapp); åpne paper- og live-session fra liste/dashboard; sjekk at ingen lenker går til `/live-trading/[id]`.

---

## 5. Kort oppsummert

| Før                                                              | Etter                                                                            |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Flere innganger (dashboard/trading, live-trading, paper-trading) | Én inngang: `/paper-trading` (redirect fra de andre)                             |
| Liste uten modus-switch                                          | Default = dashboard; `?view=sessions` = liste; `?mode=live` = tydelig live-modus |
| Live-session lenke → 404                                         | Alle sessions → `/paper-trading/[id]`; modus vises i UI                          |
| Tydelighet avhengig av URL                                       | Tydelig banner/tab: Øving (grønn) vs Live (rød) på alle relevante vyer           |

_Sist oppdatert: mars 2026._
