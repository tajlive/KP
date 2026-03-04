# 🤝 Prosjektoverlevering: Antigravity → Claude

**Dato:** 15. februar 2026  
**Fra:** Antigravity  
**Til:** Claude (Kimi Code Assistant)  
**Prosjekt:** Klarpakke Universitet

---

## 🎯 Executive Summary

### Hva er Klarpakke?

Klarpakke er en alt-i-ett plattform for krypto-trading som kombinerer utdanning (Klarpakke Universitet) med avansert auto-trading (Taj Engine). Prosjektet er rettet mot norske småsparere som ønsker en premium, trygg og automatisert inngang til kryptomarkedet uten å være finansielle rådgivere.

### Nåværende Status

- **Fase:** Beta / Soft Launch (Flyttet fra Vercel til Cloudflare/Next.js hybrid)
- **Brukere:** ~100+ (Leads fra LinkedIn og tidligere kunder)
- **MRR:** Vokser (Stripe/Vipps integrert)
- **Siste deploy:** 15. februar 2026

---

## 🏗️ Systemarkitektur

### Tech Stack

```
Frontend:     Next.js 15.4 + React 19 + TypeScript + Tailwind
Backend:      Supabase (Postgres + Edge Functions)
AI:           Moonshot AI (Kimi) via Edge Functions + Perplexity for research
Betaling:     Stripe (Global) + Vipps (Norge)
Auth:         Supabase Auth (Email, Google, Microsoft, Apple) - Nå med konsolidert trigger
Deploy:       Cloudflare Pages (Frontend), Supabase (Backend), GitHub Actions (CI/CD)
Monitoring:   Sentry + Supabase Logs + Cloudflow Analytics
```

### Kritiske Integrasjoner

| Tjeneste    | Formål                   | Status | Dokumentasjon                      |
| ----------- | ------------------------ | ------ | ---------------------------------- |
| Binance API | Trading data & Execution | ✅     | `docs/BINANCE-IP-WHITELIST.md`     |
| Stripe      | Betalinger & Subs        | ✅     | `docs/STRIPE-SETUP-COMPLETE.md`    |
| Vipps       | Norske betalinger        | ✅     | `docs/20250214_vipps_payments.sql` |
| Moonshot AI | AI Coach (Taj)           | ✅     | `docs/MOONSHOT-INTEGRATION.md`     |
| Resend      | Epost-varsling           | ✅     | `docs/GITHUB-ACTIONS-SETUP.md`     |

---

## 📊 Nåværende Tilstand

### ✅ Hva Fungerer (Produksjonsklart)

- [x] Brukerregistrering og innlogging (Konsolidert flyt 15. feb)
- [x] Dashboard med portfolio-visning (Binance Sync)
- [x] Paper trading simulering (Fullt isolert system)
- [x] Kurs-modul (6+ kurs ferdigstilt)
- [x] Betaling via Stripe
- [x] Betaling via Vipps (Vipps SDK integrert)
- [x] AI Coach (Moonshot / Taj-personlighet)
- [x] Admin dashboard (Inkludert user management via MCP)
- [x] Automatisk trading (Taj Engine v2)
- [x] Push notifications (Vapid keys konfigurert)
- [x] Epost-kampanjer (Resend + automatiske triggers)

### ⚠️ Hva er Delvis Ferdig (Trenger Polish)

| Feature               | Hva mangler               | Prioritet |
| --------------------- | ------------------------- | --------- |
| [F.eks. Auto-trading] | [Stop-loss fungerer ikke] | Høy       |
| [F.eks. Kurs-quiz]    | [Resultater lagres ikke]  | Medium    |

### ❌ Hva er Ikke Startet/Brutket

| Feature               | Hvorfor ikke ferdig | Plan      |
| --------------------- | ------------------- | --------- |
| [F.eks. Copy trading] | [Avhengig av API]   | [Q2 2026] |

---

## 🗄️ Database Oversikt

### Kritiske Tabeller

| Tabell                | Hensikt              | RLS Status | Notater                     |
| --------------------- | -------------------- | ---------- | --------------------------- |
| `profiles`            | Brukerdata & Auth    | ✅         | Konsolidert trigger 15. feb |
| `portfolios`          | Brukerens beholdning | ✅         | Koblet til Binance Sync     |
| `auto_trades`         | Handelshistorikk     | ✅         | Faktiske Binance trades     |
| `trading_risk_config` | Risiko-innstillinger | ✅         | Styrer leverage & SL        |
| `courses`             | Kursinnhold          | ✅         | Markdown-basert             |
| `subscriptions`       | Betalingsstatus      | ✅         | Synket med Stripe           |

### Nylige Migrasjoner

```sql
-- Siste kritiske migrasjoner
20260215000008_fix_auth_triggers.sql      -- Konsolidert auth trigger
20260215000005_security_hardening.sql     -- RLS & Function security
20260215000006_exec_sql_function.sql      -- SQL verktøy for MCP
20260213000000_funnel_tracking.sql       -- Konverterings-tracking
```

### Kjente Database-Issues

- [ ] [F.eks. Gamle trades har feil valutakurs]
- [ ] [F.eks. Noen profiler mangler created_at]

---

## 🔧 Edge Functions Status

### Aktive Functions (Kritiske)

| Function                 | Hensikt              | Status | Sist Deployet |
| ------------------------ | -------------------- | ------ | ------------- |
| `api-gateway`            | Hoved API gateway    | ✅     | 15. feb 2026  |
| `taj-trade-engine`       | Auto-trading motor   | ✅     | 15. feb 2026  |
| `moonshot-chat`          | AI Coach integrasjon | ✅     | 15. feb 2026  |
| `welcome-email`          | Velkomstepost        | ✅     | 15. feb 2026  |
| `binance-portfolio-sync` | Sync portefølje      | ✅     | 12. feb 2026  |

### Functions som Trenger Oppmerksomhet

| Function                  | Problem              | Forslag til Fix |
| ------------------------- | -------------------- | --------------- |
| [F.eks. taj-trade-engine] | [Timeout etter 120s] | [Øke til 300s]  |

---

## 💰 Økonomi & Betaling

### Stripe

- **Miljø:** Live (API-nøkler i .env og Secrets)
- **Webhook URL:** `https://www.klarpakke.no/api/webhooks/stripe`
- **Produkter:** Student (99,-), Bachelor (299,-), Master (499,-), PhD (799,-), Professor (1299,-)
- **Status:** Fullt integrert og testet.

### Vipps

- **Miljø:** Prod
- **Status:** Integrert via MobilePay SDK og Edge Functions.

### Abonnementsnivåer

| Nivå      | Pris    | Features                  | Stripe Price ID |
| --------- | ------- | ------------------------- | --------------- |
| Free      | 0 kr    | Paper Trading & Basiskurs | N/A             |
| PhD       | 799 kr  | FULL Auto-trading (Taj)   | [Se Stripe DB]  |
| Professor | 1299 kr | Personlig AI Coach + VIP  | [Se Stripe DB]  |

---

## 🔄 Daglige/Ukentlige Rutiner

### Automatiske Jobber (Cron)

| Jobb            | Når          | Hva gjør den             | Status |
| --------------- | ------------ | ------------------------ | ------ |
| Portfolio sync  | Hver time    | Henter data fra Binance  | ✅     |
| Trade execution | Hvert 5. min | Kjører Taj Engine logikk | ✅     |
| Epost-kampanje  | Daglig 09:00 | Velkomst & Beta-feedback | ✅     |
| Backup          | Daglig 03:00 | Supabase Managed Backup  | ✅     |

### Manuelle Rutiner

| Oppgave               | Hvor ofte | Hvem   | Instruksjoner          |
| --------------------- | --------- | ------ | ---------------------- |
| Sjekk trading-log     | Daglig    | DevOps | Supabase Logs explorer |
| Godkjenn Beta-brukere | Ukentlig  | Admin  | Admin Dashboard        |

---

## 🚨 Drift & Overvåking

### Hvor Sjekker Man Status?

- **Cloudflare Pages:** Deployment status for frontend
- **Supabase Dashboard:** Database, Auth, og Edge Functions status
- **Stripe Dashboard:** Betalingsflyt og feilede webhooks
- **Sentry:** Frontend bug-tracking
- **MCP Server:** Live inspeksjon via Claude

### Kritiske Alarmer

| Alarm              | Trigger               | Eskalering      |
| ------------------ | --------------------- | --------------- |
| Trading motor nede | Ingen pings på 15 min | Taj (SMS/Slack) |
| Betaling feiler    | 3+ webhooks i kø      | Taj (Email)     |

### Hva Gjør Man Ved Krise?

1. **Trading stopper:** Bruk `panic_close_all` verktøyet i MCP.
2. **Betalinger fungerer ikke:** Sjekk Stripe Webhook Signing Secret i Supabase.
3. **Site er nede:** Sjekk Cloudflare DNS og Pages deployment.

---

## 🎓 Domene-Kunnskap

### Trading-Termer

| Term       | Forklaring                               | Viktighet |
| ---------- | ---------------------------------------- | --------- |
| Taj Engine | Klarpakkes proprietære trading-algoritme | Høy       |
| Risk Level | Low/Medium/High (Styrer leverage)        | Høy       |
| KLT Token  | Intern belønnings-valuta                 | Medium    |

### Forretningsregler

- [x] Brukere må ha aktivert Binance API før Taj Engine starter
- [x] Kun PhD og Professor nivå har tilgang til ekte auto-trading
- [x] Alle trades logges med "Execution ID" for revisjon

---

## 🔐 Sikkerhet & Tilgang

### Kritiske Nøkler (ikke del offentlig!)

| Tjeneste              | Hvor lagret          | Hvem har tilgang | Roteringsfrekvens |
| --------------------- | -------------------- | ---------------- | ----------------- |
| Supabase Service Role | GitHub Secrets, .env | [Roller]         | [Når]             |
| Stripe Secret         | GitHub Secrets       | [Roller]         | [Når]             |
| Binance API           | Supabase Secrets     | [Roller]         | [Når]             |

### Nylige Sikkerhetshendelser

- [Dato]: [Hva skjedde, hvordan ble det løst]

---

## 📈 Roadmap & Prioritering

### Q1 2026 (Nåværende kvartal)

- [ ] [Feature 1 - Prioritet: Høy]
- [ ] [Feature 2 - Prioritet: Medium]

### Q2 2026

- [ ] [Feature 3]
- [ ] [Feature 4]

### Backlog (Ikke prioritert)

- [ ] [Feature 5]
- [ ] [Feature 6]

---

## 📝 Viktig Kontekst

### "Hvis jeg bare kunne si én ting..."

**Taj Engine må ALDRI kjøre uten en validert `trading_risk_config` for brukeren.** Vi har lagt inn sikkerhetssjekker, men hvis Claude skriver ny trading-logikk, må du ALLTID sjekke `max_leverage` før du sender en ordre til Binance. En feil her kan tømme en brukerkonto på minutter.

### Vanlige "Gotchas"

1. **Auth Redirects:** Google OAuth trenger nøyaktig callback-URL (prod vs dev).
2. **Migration Order:** Kjør ALLTID migrasjoner via GitHub Actions eller `migrations-runner`, aldri manuelt i SQL Editor uten backup.
3. **API Timeouts:** Binance API er ekstremt streng på rate limits - bruk caching der det er mulig.

### Hvem Å Kontakte

| Rolle        | Navn   | Kontakt           | For hva      |
| ------------ | ------ | ----------------- | ------------ |
| Produkteier  | Taj    | post@klarpakke.no | Alt          |
| AI Assistant | Claude | MCP Enabled       | Daglig drift |

---

## 🔧 Claude-spesifikk Konfigurasjon

### MCP Server Status

```json
{
  "server": "klarpakke-mcp-server",
  "path": "/Users/taj/klarpakke/klarpakke-mcp-server/src/index.ts",
  "tools": 84,
  "status": "✅ Konfigurert i Claude Desktop"
}
```

### Viktige Miljøvariabler

| Variabel          | Hvor satt             | Formål           |
| ----------------- | --------------------- | ---------------- |
| SUPABASE_URL      | Claude Desktop config | Database tilgang |
| SUPABASE_KEY      | Claude Desktop config | Service role key |
| STRIPE_SECRET_KEY | Claude Desktop config | Betalinger       |
| ...               | ...                   | ...              |

---

## ✅ Overleverings-Sjekkliste

### Før Overlevering (Antigravity)

- [ ] Dokumentasjon er oppdatert
- [ ] Alle secrets er dokumentert (ikke i filen, men hvor de finnes)
- [ ] Siste kode er committed og pushed
- [ ] Database er i konsistent tilstand
- [ ] Ingen kritiske bugs er uferdige

### Under Overlevering (Sammen)

- [ ] Gå gjennom denne filen sammen
- [ ] Demo av kritiske funksjoner
- [ ] Q&A session
- [ ] Avtale oppfølgingsmøte (1 uke)

### Etter Overlevering (Claude)

- [ ] Bekrefte alle verktøy fungerer
- [ ] Teste deploy-prosess
- [ ] Verifisere monitoring
- [ ] Sette opp rutiner

---

## 📞 Nødkontakt

**Hvis noe går galt og Claude ikke kan løse det:**

- Antigravity: [Telefon/Email/Slack]
- Taj: [Telefon/Email]

---

**Sign-Off:**

| Rolle       | Navn        | Signatur               | Dato |
| ----------- | ----------- | ---------------------- | ---- |
| Fra         | Antigravity | **\*\***\_\_\_**\*\*** |      |
| Til         | Claude/Kimi | N/A                    |      |
| Godkjent av | Taj         | **\*\***\_\_\_**\*\*** |      |

---

_Denne filen er levende dokumentasjon - oppdater den når ting endrer seg!_
