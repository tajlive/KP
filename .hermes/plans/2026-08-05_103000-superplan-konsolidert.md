# SUPERPLAN: Forenkling og fjerning på tvers av alle sider

> **For Hermes:** Bruk subagent-driven-development for å implementere denne planen oppgave-for-oppgave.

**Mål:** Gjøre Klarpakke enklere for brukere med lav IT-kompetanse og null kryptoerfaring. Fjerne alt som forvirrer, dupliserer, eller ikke har ett klart formål.

**Metode:** 4 parallelle subagenter har analysert alle 91 sider. Denne planen konsoliderer funnene.

---

## Kritisk funn: Placeholders og falske ting i PRODUKSJON

| Funn | Side | Alvorlighet |
|------|------|-------------|
| **«Q»/«A»-placeholders** | `/hjelp` | 🔴 P0 — Ubrukelig for 60-åring |
| **Falsk kontaktform** — sender ingenting | `/kontakt` | 🔴 P0 — Bedrag mot brukeren |
| **TrustBar lyver** — BankID/Encrypted/Regulated | Onboarding | 🔴 P0 — Compliance-risiko |
| **«Tittel»/«Warning tittel»** | `/admin/support/impersonate` | 🔴 P0 — Synlig for Tom |
| **Falske tall** («—»/«∞»/320ms) | `/admin/v3`, `/admin/health` | 🔴 P0 — Villedende |
| **Deploy-knapp gjør ingenting** | `/admin/deploy` | 🔴 P0 — Tom tror han deployer |
| **E-post-kaos** — 3 adresser | Alle | 🟡 P1 — Skal være post@klarpakke.no |

---

## Duplikater: 3 av alt

| Konsept | Sider | Anbefaling |
|---------|-------|------------|
| **Handel** | `/trade`, `/handel`, `/dashboard/trade` | **Behold kun `/handel`** |
| **Admin** | `/admin`, `/admin/v2`, `/admin/v3` | **Behold kun `/admin`** |
| **Onboarding** | `/onboarding`, `/velg-strategi`, `/velkommen` | **Behold kun `/onboarding`** |
| **Om oss** | `/about`, `/om-oss` | **Behold kun `/om-oss`** |
| **Resultater** | `/dashboard/resultater`, `/dashboard/analysis` | **Slå sammen** |
| **Brukere** | `/admin/users`, `/admin/students` | **Slå sammen** |
| **Status** | `/admin/health`, `/admin/monitor`, `/admin/system` | **Slå sammen** |

---

## 5 faser

### Fase 1: Fjern døde sider (P0 — umiddelbart)

| Side | Problem | Handling |
|------|---------|----------|
| `/trade` | Gammel terminal, hardkodet, BETA-badge | **Slett** — redirect til `/handel` |
| `/admin/v2` | Iframe til fil som ikke finnes → blank side | **Slett** |
| `/admin/v3` | Falske statistikker | **Slett** |
| `/admin/deploy` | Simulert UI, ingen API-kall | **Slett** |
| `/velg-strategi` | Død, SetupWizard gjør ingenting | **Slett** |
| `/velkommen` | Død, placeholder-i18n | **Slett** |
| `/about` | Duplikat av `/om-oss` | **Slett** — 301 til `/om-oss` |
| `/bots` | Orphan, dupliserer Auto-modus | **Slett** |
| `/mobiloversikt` | Internt QA-verktøy, offentlig | **Slett** |
| `/onboarding/step3-trading-mode` | Død, ikke i flyt | **Slett** |
| `/onboarding/step4-binance` | Død, ikke i flyt | **Slett** |
| `/onboarding/step5-complete` | Død, duplikat success | **Slett** |

**Resultat:** 91 → 79 sider

---

### Fase 2: Fiks placeholders og falske ting (P0 — tillit)

| Problem | Side | Fiks |
|---------|------|------|
| «Q»/«A»-placeholders | `/hjelp` | Koble til `FAQ.fallbacks` eller redirect til `/vanlige-sporsmal` |
| Falsk kontaktform | `/kontakt` | Koble til Resend-API eller fjern skjema |
| TrustBar lyver | Onboarding | Fjern BankID/Encrypted/Regulated — bruk «100% lekepenger» |
| «Tittel»/«Warning tittel» | `/admin/support/impersonate` | Fiks i18n-nøkler |
| Falske tall | `/admin/health` | Fjern hardkodede 320ms/3.2% |
| E-post-kaos | Alle | Alle → `post@klarpakke.no` |
| «Norges eneste» | Landing | Fjern superlativ |
| Død lenke | `/dashboard/resultater` → `/handelshistorikk` | Fiks til `/dashboard/historikk` |

---

### Fase 3: Slå sammen duplikater (P1 — forenkling)

| Før | Etter | Handling |
|-----|-------|----------|
| `/dashboard/resultater` + `/dashboard/analysis` | `/dashboard/resultater` | Slå sammen — fjern enterprise-jargon |
| `/admin/users` + `/admin/students` | `/admin/users` | Slå sammen — behold bekreftelsesmodaler |
| `/admin/health` + `/admin/monitor` + `/admin/system` | `/admin/system` | Slå sammen — system er beste |
| `/admin/auto-trading` + `/admin/auto-trading/sessions` | `/admin/auto-trading` | Slå sammen |
| `/kurs` + `/akademi` | `/kurs` | Slå sammen |

---

### Fase 4: Forenkle dashboard (P1 — brukerreise)

| Side | Problem | Tiltak |
|------|---------|--------|
| `/dashboard` | RiskMetricsPanel (Sortino/Calmar/VaR) | **Fjern** — for teknisk |
| `/dashboard` | TopBar + StatsGrid dupliserer | **Slå sammen** — én tallblokk |
| `/dashboard/portfolio` | Wallet-seksjon + stats-rad dupliserer | **Fjern** — behold kun saldo + graf + posisjoner |
| `/dashboard/historikk` | Beslutningslogg + integrity-warning | **Fjern** — internmekanikk |
| `/dashboard/historikk` | 9 kolonner | **Reduser** — Dato/Par/Kjøp-Salg/Beløp/Resultat |
| `/dashboard/referral` | «Kommer snart»-stub | **Fjern** fra meny |
| `/dashboard/settings` | Bare redirect | **Fjern** fra meny |
| `/profile` | Lommebok = API-nøkler (skremmende) | **Flytt** til Innstillinger |

---

### Fase 5: Forenkle admin (P1 — Tom-reise)

| Side | Problem | Tiltak |
|------|---------|--------|
| Admin-nav | 15 punkter i 5 seksjoner | **5 punkter** |
| Admin-nav | Engelske placeholders («Section oversikt») | **Oversett** |
| Admin-nav | 404-lenke «Eksperimenter» | **Fjern** |
| `/admin/ab-tests` | 100% engelsk | **Oversett** eller skjul |
| `/admin/campaign` | Kampanje over? | **Drep** hvis inaktiv |
| `/admin/users` | 1140 linjer, 8+ funksjoner | **Del i faner** |
| `/admin/sync-status` | Engelsk, teknisk | **Flytt** til Utvikler |
| `/admin/trade-health` | Farlig verktøy | **Flytt** til Utvikler |

**Ny admin-struktur:**
```
/admin → Oversikt (analytics)
/admin/users → Brukere (sammenslått)
/admin/auto-trading → Auto-trading (sammenslått)
/admin/system → Systemstatus (sammenslått)
/admin/settings → Innstillinger
```

---

## Oppsummering: 91 → 51 sider

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
| 1 | Fase 1+2 | Fjern døde sider + fiks placeholders |
| 2 | Fase 3+4 | Slå sammen duplikater + forenkle dashboard |
| 3 | Fase 5 | Forenkle admin |

---

## Verifisering

1. `npm run test` — alle tester grønne
2. `npm run lint` — 0 errors
3. `npm run check` — tsc 0 errors
4. Manuell: Gudrun Myhre (80 år) kan bruke siden uten hjelp
5. Manuell: Tom finner alt i admin uten å lete
6. i18n-sjekk: Ingen rå nøkkelstier, ingen placeholders

---

## Risiko

| Risiko | Mitigering |
|--------|------------|
| Brukere savner fjernede sider | 301 redirects |
| Admin blir for enkel | Behold avanserte funksjoner bak «Utvikler» |
| SEO-tap | 301 redirects + sitemap-oppdatering |

---

## Konkurranse-sammenligning

| | Pionex | 3Commas | Klarpakke (nå) | Klarpakke (plan) |
|---|--------|---------|---------------|------------------|
| Antall sider | ~20 | ~25 | 91 | **51** |
| Dashboard-sider | 5 | 6 | 15 | **8** |
| Admin-sider | 3 | 4 | 24 | **6** |
| Onboarding-steg | 3 | 4 | 9 | **4** |
| Målgruppe | Pro | Pro | Nybegynner | **Nybegynner** |
