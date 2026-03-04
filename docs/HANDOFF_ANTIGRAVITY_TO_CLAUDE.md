# 🤝 Prosjektoverlevering: Antigravity → Claude

**Dato:** [Fyll inn dato]  
**Fra:** Antigravity  
**Til:** Claude (Kimi Code Assistant)  
**Prosjekt:** Klarpakke Universitet

---

## 🎯 Executive Summary

### Hva er Klarpakke?
[2-3 setninger om hva prosjektet er, hvem det er for, og hovedformålet]

### Nåværende Status
- **Fase:** [Alpha/Beta/Production]
- **Brukere:** [Antall aktive brukere]
- **MRR:** [Månedlig inntekt, hvis relevant]
- **Siste deploy:** [Dato]

---

## 🏗️ Systemarkitektur

### Tech Stack
```
Frontend:     Next.js 15 + React + TypeScript + Tailwind
Backend:      Supabase (Postgres + Edge Functions)
AI:           Moonshot AI (Kimi) via Edge Functions
Betaling:     Stripe + Vipps
Auth:         Supabase Auth (Email, Google, Microsoft, Apple)
Deploy:       Vercel (frontend), Supabase (backend)
Monitoring:   [Hva brukes?]
```

### Kritiske Integrasjoner
| Tjeneste | Formål | Status | Dokumentasjon |
|----------|--------|--------|---------------|
| Binance API | Trading data | [✅/⚠️/❌] | [Lenke] |
| Stripe | Betalinger | [✅/⚠️/❌] | [Lenke] |
| Vipps | Norske betalinger | [✅/⚠️/❌] | [Lenke] |
| Moonshot AI | AI Coach | [✅/⚠️/❌] | [Lenke] |
| Resend | Epost | [✅/⚠️/❌] | [Lenke] |

---

## 📊 Nåværende Tilstand

### ✅ Hva Fungerer (Produksjonsklart)
- [ ] Brukerregistrering og innlogging
- [ ] Dashboard med portfolio-visning
- [ ] Paper trading simulering
- [ ] Kurs-modul (hvor manger kurs?)
- [ ] Betaling via Stripe
- [ ] Betaling via Vipps
- [ ] AI Coach (Moonshot)
- [ ] Admin dashboard
- [ ] Automatisk trading (Taj Engine)
- [ ] Push notifications
- [ ] Epost-kampanjer

### ⚠️ Hva er Delvis Ferdig (Trenger Polish)
| Feature | Hva mangler | Prioritet |
|---------|-------------|-----------|
| [F.eks. Auto-trading] | [Stop-loss fungerer ikke] | Høy |
| [F.eks. Kurs-quiz] | [Resultater lagres ikke] | Medium |

### ❌ Hva er Ikke Startet/Brutket
| Feature | Hvorfor ikke ferdig | Plan |
|---------|---------------------|------|
| [F.eks. Copy trading] | [Avhengig av API] | [Q2 2026] |

---

## 🗄️ Database Oversikt

### Kritiske Tabeller
| Tabell | Hensikt | RLS Status | Notater |
|--------|---------|------------|---------|
| `profiles` | Brukerdata | ✅ | [Spesielle notater] |
| `portfolios` | Porteføljer | ✅ | |
| `trades` | Handelshistorikk | ✅ | |
| `auto_trading_configs` | Auto-trading instillinger | ✅ | |
| `courses` | Kursinnhold | ✅ | |
| `subscriptions` | Abonnementer | ✅ | |

### Nylige Migrasjoner
```sql
-- Liste siste 5 migrasjoner som er kjørt
20260215000008_fix_auth_triggers.sql      -- Fikset auth triggers
[Legg til flere...]
```

### Kjente Database-Issues
- [ ] [F.eks. Gamle trades har feil valutakurs]
- [ ] [F.eks. Noen profiler mangler created_at]

---

## 🔧 Edge Functions Status

### Aktive Functions (38 totalt)
| Function | Hensikt | Status | Sist Deployet |
|----------|---------|--------|---------------|
| `api-gateway` | Hoved API gateway | ✅ | [Dato] |
| `moonshot-chat` | AI Coach integrasjon | ✅ | [Dato] |
| `taj-trade-engine` | Auto-trading motor | ⚠️ | [Dato] |
| `taj-position-checker` | Sjekker posisjoner | ✅ | [Dato] |
| `welcome-email` | Velkomstepost | ✅ | [Dato] |
| `migrations-runner` | SQL kjøring | ✅ | [Dato] |

### Functions som Trenger Oppmerksomhet
| Function | Problem | Forslag til Fix |
|----------|---------|-----------------|
| [F.eks. taj-trade-engine] | [Timeout etter 120s] | [Øke til 300s] |

---

## 💰 Økonomi & Betaling

### Stripe
- **Miljø:** [Test/Live]
- **Webhook URL:** `https://www.klarpakke.no/api/webhooks/stripe`
- **Produkter:** [Liste over produkter/priser]
- **Kjente issues:** [F.eks. Webhook feiler noen ganger]

### Vipps
- **Miljø:** [Test/Prod]
- **Webhook URL:** `https://www.klarpakke.no/api/vipps/webhook`
- **Kjente issues:** [F.eks. Timeout på callback]

### Abonnementsnivåer
| Nivå | Pris | Features | Stripe Price ID |
|------|------|----------|-----------------|
| Free | 0 kr | [Features] | N/A |
| Student | 99 kr | [Features] | [ID] |
| Bachelor | 299 kr | [Features] | [ID] |
| Master | 499 kr | [Features] | [ID] |
| PhD | 799 kr | [Features] | [ID] |
| Professor | 1299 kr | [Features] | [ID] |

---

## 🔄 Daglige/Ukentlige Rutiner

### Automatiske Jobber (Cron)
| Jobb | Når | Hva gjør den | Status |
|------|-----|--------------|--------|
| Portfolio sync | Hver time | Henter data fra Binance | ✅ |
| Trade execution | Hvert 5. min | Kjører trading-strategier | ⚠️ |
| Epost-kampanje | Daglig 09:00 | Sender scheduled kampanjer | ✅ |
| Backup | Daglig 03:00 | Database backup | ✅ |

### Manuelle Rutiner
| Oppgave | Hvor ofte | Hvem | Instruksjoner |
|---------|-----------|------|---------------|
| [F.eks. Sjekk trading-log] | Daglig | [Rolle] | [Lenke til runbook] |
| [F.eks. Godkjenn uttak] | Ved behov | [Rolle] | [Lenke til prosedyre] |

---

## 🚨 Drift & Overvåking

### Hvor Sjekker Man Status?
- **Vercel Dashboard:** [Lenke]
- **Supabase Dashboard:** [Lenke]
- **Stripe Dashboard:** [Lenke]
- **Sentry (feil):** [Lenke]
- **Cloudflare:** [Lenke]

### Kritiske Alarmer
| Alarm | Trigger | Eskalering |
|-------|---------|------------|
| Trading motor nede | Ingen trades på 15 min | [Hvem kontaktes] |
| Betaling feiler | 3+ feil på 10 min | [Hvem kontaktes] |
| Database CPU > 80% | Sustained i 5 min | [Hvem kontaktes] |

### Hva Gjør Man Ved Krise?
1. **Trading stopper:** [Steg for steg]
2. **Betalinger fungerer ikke:** [Steg for steg]
3. **Database er nede:** [Steg for steg]
4. **Site er nede:** [Steg for steg]

---

## 🎓 Domene-Kunnskap

### Trading-Termer
| Term | Forklaring | Viktighet |
|------|------------|-----------|
| Paper trading | Simulert trading uten ekte penger | Høy |
| Auto-trading | Automatisk kjøp/salg basert på strategi | Høy |
| Copy trading | Kopiere andre traders sine handler | Medium |
| Stop-loss | Automatisk salg ved tap | Høy |
| Take-profit | Automatisk salg ved gevinst | Høy |

### Forretningsregler
- [ ] Brukere kan ikke trade med ekte penger uten KYC
- [ ] Gratisbrukere får kun paper trading
- [ ] Abonnement fornyes automatisk
- [ ] ... [Flere regler]

---

## 🔐 Sikkerhet & Tilgang

### Kritiske Nøkler (ikke del offentlig!)
| Tjeneste | Hvor lagret | Hvem har tilgang | Roteringsfrekvens |
|----------|-------------|------------------|-------------------|
| Supabase Service Role | GitHub Secrets, .env | [Roller] | [Når] |
| Stripe Secret | GitHub Secrets | [Roller] | [Når] |
| Binance API | Supabase Secrets | [Roller] | [Når] |

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
[Antigravity - skriv det viktigste du vil at Claude skal vite]

### Vanlige "Gotchas"
1. [F.eks. "Auth-cookies expires etter 1 uke, ikke 1 dag som forventet"]
2. [F.eks. "Vipps webhook er ustabil mellom 02:00-04:00"]
3. [F.eks. "Moonshot API har rate limit på 500 req/min"]

### Hvem Å Kontakte
| Rolle | Navn | Kontakt | For hva |
|-------|------|---------|---------|
| Produkteier | [Navn] | [Email/Slack] | Feature-prioritering |
| Designer | [Navn] | [Email/Slack] | UI/UX-spørsmål |
| Domain expert | [Navn] | [Email/Slack] | Trading-spørsmål |
| DevOps | [Navn] | [Email/Slack] | Infrastruktur |

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
| Variabel | Hvor satt | Formål |
|----------|-----------|--------|
| SUPABASE_URL | Claude Desktop config | Database tilgang |
| SUPABASE_KEY | Claude Desktop config | Service role key |
| STRIPE_SECRET_KEY | Claude Desktop config | Betalinger |
| ... | ... | ... |

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

| Rolle | Navn | Signatur | Dato |
|-------|------|----------|------|
| Fra | Antigravity | _______________ | |
| Til | Claude/Kimi | N/A | |
| Godkjent av | Taj | _______________ | |

---

*Denne filen er levende dokumentasjon - oppdater den når ting endrer seg!*
