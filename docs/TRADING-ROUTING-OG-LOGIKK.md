# Trading – routing og logikk (sjekk)

**Sist sjekket:** mars 2026 (én trading-side alt 1).

---

## 1. Ruter

| URL                                              | Oppførsel                                                                                                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/[locale]/paper-trading`                        | Hovedside. Uinnlogget → teaser (Logg inn / Opprett konto). Innlogget → `PaperTradingPageClient`: default = dashboard, `?view=sessions` = session-liste, `?mode=live` = live-modus. |
| `/[locale]/paper-trading?view=sessions`          | Session-liste (kun paper-sessions fra server). Banner vises etter `?mode=live`.                                                                                                    |
| `/[locale]/paper-trading?mode=live`              | Dashboard med live-modus. **Tier-gate:** krever minLevel 1 (basis/bachelor+).                                                                                                      |
| `/[locale]/paper-trading/[session_id]`           | Session-detalj. Eiersjekk (user_id). Støtter både paper og live (ingen mode-filter). Banner fra `session.mode`.                                                                    |
| `/[locale]/paper-trading/[session_id]?mode=live` | Samme som over; brukes fra BotStatusCard for live-session. Også tier-gated.                                                                                                        |
| `/[locale]/dashboard/trading`                    | Redirect → `/[locale]/paper-trading`.                                                                                                                                              |
| `/[locale]/live-trading`                         | Redirect → `/[locale]/paper-trading?mode=live`.                                                                                                                                    |
| `/[locale]/live-trading/[id]`                    | **Finnes ikke.** Bruk `/paper-trading/[id]` (ev. `?mode=live`).                                                                                                                    |

---

## 2. Middleware og auth

- **PROTECTED_PATHS:** `/paper-trading` er **ikke** med – uinnloggede får teaser, ikke redirect til innlogging.
- **Onboarding:** Kjører kun for beskyttede paths når bruker er innlogget.
- **Tier-gate:** Kjører for **alle** innloggede forespørsler (ikke bare protected). Gater:
  - `/[locale]/paper-trading` med `?mode=live` (og underpaths, f.eks. session-detalj med `?mode=live`) → minLevel 1.
  - `/[locale]/dashboard/bots` → minLevel 2.

---

## 3. Data og visning

- **Paper-trading page (server):** Henter kun **paper**-sessions (`.eq("mode", "paper")`) og `paper_balance`. Sendes til `PaperTradingPageClient`.
- **Session-detalj (server):** Henter session på `id` + `user_id` (ingen mode-filter) – både paper og live.
- **PaperTradingPageClient:** Leser `view` og `mode` fra URL; `initialMode` til dashboard; `showSessionsList = view === "sessions"`.
- **UnifiedTradingDashboard:** Synker modus til URL (`router.replace` ved bytte paper/live). Lenke «Mine sesjoner» → `?view=sessions` (ev. `&mode=live`).

---

## 4. Lenker (viktigste)

| Fra                                                       | Til                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| DashboardSidebar «Handle»                                 | `/${locale}/paper-trading`                                  |
| DashboardTabs «Practice»                                  | `/${locale}/paper-trading`                                  |
| BotStatusCard (paper)                                     | `/${locale}/paper-trading/${id}`                            |
| BotStatusCard (live)                                      | `/${locale}/paper-trading/${id}?mode=live`                  |
| OnboardingCompletion / OnboardingFlow «Prøv live trading» | `/${locale}/paper-trading?mode=live`                        |
| EmptyBotState «Start paper trading»                       | `/${locale}/paper-trading`                                  |
| dashboard/guide                                           | `/${locale}/dashboard/trading` (redirect til paper-trading) |

---

## 5. Rettelser gjort under sjekk

1. **Tier-gate:** Ble tidligere kun kjørt for `isProtected && user`. Nå kjøres `handleTierGate` for **alle** innloggede, slik at `/paper-trading?mode=live` (og tilsvarende) gates riktig.
2. **EmptyBotState:** Brukte `router.push("/paper-trading")` uten locale. Endret til `router.push(\`/${locale}/paper-trading\`)`.

---

## 6. Kort sjekkliste

- [x] `/dashboard/trading` og `/live-trading` redirecter til `/paper-trading` (ev. `?mode=live`).
- [x] Ingen rute `/live-trading/[id]`; alle session-lenker går til `/paper-trading/[id]`.
- [x] Tier-gate for live kjøres for innloggede (uavhengig av protected path).
- [x] Session-detalj tillater både paper og live (eiersjekk, ingen mode-filter).
- [x] EmptyBotState og andre CTA bruker locale i lenke til paper-trading.
- [x] Sidebar/tabs bruker `/${locale}${href}` for paper-trading.
