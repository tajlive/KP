# Klarpakke Produktrevisjon — Funnrapport 2026-08-12

> **Metode:** Tekniske gater + kodeanalyse + QA-skill pitfalls + subagent partial data.
> **Status:** AUDIT. Ingen endringer utført uten godkjenning.

---

## Teknisk baseline

| Gate                          | Resultat                                  |
| ----------------------------- | ----------------------------------------- |
| `tsc --noEmit`                | 0 feil ✅                                 |
| `eslint src --max-warnings 0` | 0 warnings ✅                             |
| `vitest run` (259 filer)      | 257 ✅ · **1 ❌** · 1 ⏭️                  |
| `npm run build`               | Exit 1 — **Cloudflare edge-preview auth** |

### 1 feilende test

**`e5-regimefilter.test.ts:115`** — RANGE-test forventet `regime != "trend"`, men test-data produserer ADX ≥ 25 (TREND). E5-forskningstest, utenfor produksjonsflyt.

### Build — pre-eksisterende

`CLOUDFLARE_API_TOKEN` mangler Workers Edge Preview-scope. Ikke nytt.

---

## Funn: Prioritert etter alvorlighet

### 🔴 P0 — Saldo-/pengefeil

**F1: paper_accounts.current_balance propageres ukritisk til UI** (FIKKET INC-2026-08-12, men DB-trigger er en vedvarende risiko)

- Sti: `paper_accounts` → DB-trigger → `user_profiles.paper_balance` → `/api/user/profile` → Dashboard
- Risiko: Inflaterte saldoer (188 909 kr) vises som reelle. Bruker tror de har ~200k, har egentlig 100k.
- **Reparasjon utført for Tom. Guard på plass (1.5× cap).**

### 🟠 P1 — Design/UI

**F2: Dashboard viser motstridende tall** (dokumentert 2026-08-05, fortsatt ufikset)

- Tre ulike «hvor mye har jeg»-tall: toppbar (ledig+investert), portfolio-hero (kun cash), resultater-KPI (all-time mens grafer er 30d)
- Bruker kan ikke bekrefte egen verdi

**F3: AI-slopp i UI** (dokumentert 2026-08-08, delvis fikset)

- Emoji-ikoner (💳/📈/🚀) der proffe plattformer bruker SVG
- «AI analyserer RSI/SMA» → strategien er mekanisk grid, teksten løy (fikset for PilotDashboard, uvisst om alle flater er oppdatert)
- Dev-språk i brukerflater: «Trader kjører (10)» → «Auto-handel aktiv»

**F4: Placeholder-tekster i produksjon**

- `trading.cockpit.header.title` = «Tittel» (rendres som H1)
- `interactive.*` = «Title 1»/«Description»/«Cta»/«Start Bot»
- i18n-keys.spec.ts fanger kun manglende nøkler, ikke placeholder-verdier

### 🟡 P2 — UX/Flyt

**F5: Register → dashboard hopper over onboarding** (dokumentert 2026-08-05)

- Nye brukere får aldri valgt startkapital eller sett onboarding
- `RegisterClient` sender `hasSession`-brukere rett til dashboard, ingen `onboarding_completed`-guard

**F6: OnboardingTrustBar viser falske påstander**

- «BankID»/«Encrypted»/«Regulated» (Klarpakke har ingen av delene)
- «Regulated» er compliance-risiko

**F7: Døde lenker i navigasjon og CTA-er**

- `/trade` → 308 redirect til `/handel` (12+ steder i features-komponenter)
- `/dashboard/auto-trade`, `/beta/auto-trade`, `/admin/experiments` → 404

### 🟢 P3 — Copy/Innhold

**F8: E-postadresser inkonsistente**

- Standard: `post@klarpakke.no`
- Fant `support@klarpakke.no` i /vanlige-sporsmal
- Flere brukerflater bruker feil adresse

**F9: «Lekepenger»-regel brutt i enkelte flater**

- Må gjennomgås: alle tekster om pengegaver skal inneholde «lekepenger»

### ⚪ P4 — Tilgjengelighet

**F10: A11y-status ukjent**

- Ingen automatisk a11y-audit kjørt
- Fargekontrast, focus states, skjermleser-støtte, og touch-targets er ikke systematisk testet

---

## Anbefalt prioritering

| #   | Tiltak                                 | Type    | Estimert innsats |
| --- | -------------------------------------- | ------- | ---------------- |
| 1   | Fjern placeholder-tekster (F4)         | Copy    | Medium           |
| 2   | Fiks register→onboarding-hullet (F5)   | UX      | Liten            |
| 3   | Fjern falske påstander i TrustBar (F6) | Copy    | Liten            |
| 4   | Bytt emoji-ikoner → SVG (F3)           | Design  | Medium           |
| 5   | Fiks døde lenker (F7)                  | Routing | Liten            |
| 6   | Konsolider e-postadresser (F8)         | Copy    | Liten            |
| 7   | Enhetlig dashboard-saldo (F2)          | Data/UX | Stor             |
| 8   | A11y-audit (F10)                       | A11y    | Stor             |

---

## Hva er IKKE revidert (trenger egen runde)

- Admin-sider (rollebasert tilgang, farlige handlinger, audit trail)
- Live trading (kun papir-revisjon — OKX-kjeden krever separat sikkerhetsaudit)
- Betaling/Stripe (priskonsistens, avbrutt betaling, dobbeltklikk)
- Ytelse (Lighthouse, Core Web Vitals, bundle size)
- Sikkerhet (CSP, CORS, SQL injection, XSS, secrets)

---

**Forfatter:** Hermes · 2026-08-12 · **VENTER PÅ TOM SIN GODKJENNING AV PRIORITERT GJENNOMFØRINGSPLAN**
