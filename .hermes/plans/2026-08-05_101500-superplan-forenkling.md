# Superplan: Forenkling og fjerning på tvers av alle sider

> **For Hermes:** Bruk subagent-driven-development for å implementere denne planen oppgave-for-oppgave.

**Mål:** Gjøre Klarpakke enklere for brukere med lav IT-kompetanse og null kryptoerfaring. Fjerne alt som forvirrer, dupliserer, eller ikke har ett klart formål.

**Metode:** 4 parallelle subagenter har analysert alle 91 sider. Denne planen konsoliderer funnene.

---

## Nåværende tilstand: 91 sider

| Kategori | Antall | Kommentar |
|----------|--------|-----------|
| Marketing | 12 | Landingssider, priser, hjelp |
| Dashboard | 15 | Hovedside, portefølje, historikk, resultater |
| Admin | 24 | Kontrollpanel, brukere, system |
| Onboarding | 9 | Steg-for-steg introduksjon |
| Auth | 4 | Login, registrering, passord |
| Social | 5 | Copy-trading, leaderboard, pilot |
| Academy | 8 | Kurs, leksjoner |
| Andre | 14 | Legal, feil, studio, commerce |

**Problemet:** For mange sider, for mange valg, for mye duplisering.

---

## Kritisk funn: Duplikater og døde sider

| Duplikat | Antall | Anbefaling |
|----------|--------|------------|
| `/trade` vs `/dashboard/trade` vs `/handel` | 3 | **Behold kun `/dashboard/trade`** |
| `/admin` vs `/admin/v2` vs `/admin/v3` | 3 | **Behold kun `/admin`** |
| `/onboarding` vs `/velg-strategi` vs `/velkommen` | 3 | **Behold kun `/onboarding`** |
| `/om-oss` vs `/about` | 2 | **Behold kun `/om-oss`** |
| `/kurs` vs `/akademi` | 2 | **Behold kun `/kurs`** |

---

## Superplan: 5 faser

### Fase 1: Fjern duplikater (P0 — umiddelbart)

| Handling | Filer | Effekt |
|----------|-------|--------|
| Slett `/trade` (redirect til `/dashboard/trade`) | `src/app/[locale]/(user)/trade/` | 1 mindre forvirring |
| Slett `/handel` (redirect til `/dashboard/trade`) | `src/app/[locale]/(user)/handel/` | 1 mindre forvirring |
| Slett `/admin/v2` og `/admin/v3` | `src/app/[locale]/(admin)/admin/v2/`, `v3/` | 1 admin, ikke 3 |
| Slett `/velg-strategi` (redirect til `/onboarding`) | `src/app/[locale]/(onboarding)/velg-strategi/` | 1 onboarding, ikke 3 |
| Slett `/velkommen` (redirect til `/onboarding`) | `src/app/[locale]/(onboarding)/velkommen/` | 1 onboarding, ikke 3 |
| Slett `/about` (redirect til `/om-oss`) | `src/app/[locale]/(marketing)/about/` | 1 om-oss, ikke 2 |

**Resultat:** 91 → 84 sider

---

### Fase 2: Forenkle dashboard (P0 — brukerreise)

**Nåværende:** 15 dashboard-sider. Brukeren vet ikke hvor den skal.

**Forenklet struktur:**

```
/dashboard                 → Hovedside (oversikt + handlinger)
/dashboard/portfolio       → "Hvor er pengene mine?" (enkelt)
/dashboard/historikk       → "Hva har skjedd?" (enkelt)
/dashboard/resultater      → "Hvordan går det?" (enkelt)
/dashboard/settings        → Innstillinger (behold)
/dashboard/bot/[id]        → Detaljer per bot (behold)
```

**Fjernes/forenkles:**

| Side | Problem | Tiltak |
|------|---------|--------|
| `/dashboard/analysis` | For teknisk | **Fjern** — erstatt med enkel graf på hovedside |
| `/dashboard/referral` | Lite brukt | **Fjern** — legg i settings |
| `/dashboard/trade` | For kompleks | **Forenkle** — 3 valg: Start, Stopp, Se mer |
| `/dashboard/asset/[symbol]` | For teknisk | **Fjern** — integrer i portfolio |
| `/marked` | Duplikat | **Fjern** — integrer i trade |
| `/profile` | Duplikat | **Fjern** — integrer i settings |
| `/vanlige-sporsmal` | Lite brukt | **Fjern** — integrer i hjelp |

**Resultat:** 15 → 8 dashboard-sider

---

### Fase 3: Forenkle admin (P1 — Tom-reise)

**Nåværende:** 24 admin-sider. Tom vet ikke hvor han skal.

**Forenklet struktur:**

```
/admin                     → Oversikt (brukere, system, trading)
/admin/users               → Brukeradministrasjon
/admin/analytics           → Tall og grafer
/admin/settings            → Innstillinger
/admin/health              → Systemstatus
```

**Fjernes/forenkles:**

| Side | Problem | Tiltak |
|------|---------|--------|
| `/admin/ab-tests` | Lite brukt | **Fjern** |
| `/admin/auto-trading` | For teknisk | **Forenkle** — vis kun aktive/stopped |
| `/admin/campaign` | Lite brukt | **Fjern** |
| `/admin/deploy` | For teknisk | **Fjern** — CI/CD håndterer |
| `/admin/marketing/ctas` | For teknisk | **Fjern** |
| `/admin/monetization` | Lite brukt | **Fjern** |
| `/admin/monitor` | Duplikat | **Fjern** — bruk health |
| `/admin/students` | Duplikat | **Fjern** — bruk users |
| `/admin/sync-status` | For teknisk | **Fjern** — integrer i health |
| `/admin/system` | For teknisk | **Forenkle** — vis kun kritiske |
| `/admin/trade-health` | Duplikat | **Fjern** — integrer i health |
| `/admin/trader-verifications` | Lite brukt | **Fjern** |
| `/admin/support/impersonate` | Behold — kritisk | **Behold** |

**Resultat:** 24 → 6 admin-sider

---

### Fase 4: Forenkle onboarding (P1 — førsteinntrykk)

**Nåværende:** 9 onboarding-sider. Brukeren gir opp før de kommer i gang.

**Forenklet struktur:**

```
/onboarding                → Velkommen (1 side)
/onboarding/step1          → Velg modus (paper/live)
/onboarding/step2          → Sett i gang (1 klikk)
/onboarding/complete       → Ferdig (1 side)
```

**Fjernes:**

| Side | Problem | Tiltak |
|------|---------|--------|
| `/onboarding/step2-level` | For mange valg | **Fjern** — auto-velg basert på modus |
| `/onboarding/step3-trading-mode` | Duplikat | **Fjern** — integrer i step1 |
| `/onboarding/step4-binance` | For teknisk | **Fjern** — ikke relevant for paper |
| `/onboarding/step4-first-trade` | For kompleks | **Forenkle** — 1 knapp: "Start bot" |
| `/onboarding/step5-complete` | Duplikat | **Fjern** — integrer i complete |

**Resultat:** 9 → 4 onboarding-sider

---

### Fase 5: Forenkle marketing (P2 — konvertering)

**Nåværende:** 12 marketing-sider. Brukeren vet ikke hva de skal gjøre.

**Forenklet struktur:**

```
/                          → Landingsside (1 CTA: "Start gratis")
/priser                    → Priser (1 CTA: "Velg plan")
/hjelp                     → Hjelp (FAQ + kontakt)
/kurs                      → Lær mer (1 CTA per kurs)
```

**Fjernes/forenkles:**

| Side | Problem | Tiltak |
|------|---------|--------|
| `/api-dokumentasjon` | For teknisk | **Fjern** — ikke for nybegynnere |
| `/binance-guide` | For teknisk | **Fjern** — ikke relevant |
| `/bots` | Duplikat | **Fjern** — integrer i landingsside |
| `/kalkulator` | Lite brukt | **Fjern** — integrer i priser |
| `/kontakt` | Duplikat | **Fjern** — integrer i hjelp |
| `/mobiloversikt` | Lite brukt | **Fjern** — ikke nødvendig |
| `/copy-trading/discover` | For kompleks | **Forenkle** — 3 trader, ikke 50 |
| `/copy-trading/traders/[id]` | For teknisk | **Forenkle** — vis kun PnL og kopier-knapp |
| `/leaderboard` | For teknisk | **Forenkle** — vis kun topp 10 |
| `/pilot` | Duplikat | **Fjern** — integrer i dashboard |

**Resultat:** 12 → 4 marketing-sider

---

## Oppsummering: 91 → 39 sider

| Kategori | Før | Etter | Endring |
|----------|-----|-------|---------|
| Marketing | 12 | 4 | −8 |
| Dashboard | 15 | 8 | −7 |
| Admin | 24 | 6 | −18 |
| Onboarding | 9 | 4 | −5 |
| Auth | 4 | 4 | 0 |
| Social | 5 | 3 | −2 |
| Academy | 8 | 8 | 0 |
| Andre | 14 | 14 | 0 |
| **Total** | **91** | **51** | **−40** |

---

## Implementasjon: 3 uker

| Uke | Fase | Handling |
|-----|------|----------|
| 1 | Fase 1 | Fjern duplikater (7 sider) |
| 2 | Fase 2+3 | Forenkle dashboard + admin (25 sider) |
| 3 | Fase 4+5 | Forenkle onboarding + marketing (8 sider) |

---

## Verifisering

1. `npm run test` — alle tester grønne
2. `npm run lint` — 0 errors
3. `npm run check` — tsc 0 errors
4. Manuell: Gudrun Myhre (80 år) kan bruke siden uten hjelp
5. Manuell: Tom finner alt i admin uten å lete

---

## Risiko

| Risiko | Mitigering |
|--------|------------|
| Brukere savner fjernede sider | Redirect til nærmeste side |
| Admin blir for enkel | Behold avanserte funksjoner bak "Avansert"-toggle |
| SEO-tap | 301 redirects på alle fjernede sider |

---

## Konkurranse-sammenligning

| | Pionex | 3Commas | Klarpakke (nå) | Klarpakke (plan) |
|---|--------|---------|---------------|------------------|
| Antall sider | ~20 | ~25 | 91 | **51** |
| Dashboard-sider | 5 | 6 | 15 | **8** |
| Onboarding-steg | 3 | 4 | 9 | **4** |
| Målgruppe | Pro | Pro | Nybegynner | **Nybegynner** |
