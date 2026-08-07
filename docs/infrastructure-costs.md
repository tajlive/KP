# Klarpakke Infrastruktur-kostnader

> Sist oppdatert: 2026-08-07. Alle tall i USD med mindre annet er angitt.

---

## Nåværende kostnader — totaloversikt

| Plattform           | Plan                        | Fastpris/mnd | Variabelt (API-tokens) | Årlig estimat |
| ------------------- | --------------------------- | ------------ | ---------------------- | ------------- |
| **Cloudflare**      | Workers Paid + Free Website | **$5.00**    | —                      | $60           |
| **Supabase**        | Pro                         | **$25.00**   | —                      | $300          |
| **GitHub**          | Free                        | **$0.00**    | —                      | $0            |
| **Kimi (Moonshot)** | Pay-per-token API           | —            | ~$5-15                 | ~$60-180      |
| **DeepSeek**        | Pay-per-token API           | —            | ~$2-10                 | ~$24-120      |
| **Totalt**          |                             | **$30.00**   | **~$10-25**            | **~$480-660** |

---

## AI-modeller — detaljerte priser

### Kimi (Moonshot AI) — platform.kimi.ai

| Modell                    | Input (1M tok) | Output (1M tok) | Cache hit | Kontekst | Bruk                     |
| ------------------------- | -------------- | --------------- | --------- | -------- | ------------------------ |
| **Kimi K3** (2.8T params) | $3.00          | $15.00          | $0.30     | 1M       | Tung analyse, arkitektur |
| **Kimi K2.7 Code**        | $0.95          | $4.00           | $0.19     | 256K     | Primær — daglig koding   |
| **Kimi K2.6**             | $0.95          | $4.00           | $0.16     | 256K     | Fallback                 |
| **Kimi K2.5**             | $0.60          | $3.00           | $0.10     | 256K     | Lett fallback            |

> **Status:** Kimi Global API har vært suspendert (OAuth-kvote oppbrukt, $0 saldo). Kan være inaktiv for øyeblikket.

**Estimat ved aktiv bruk:** 2-3M input + 1M output per dag ≈ **$5-15/mnd**

---

### DeepSeek — api.deepseek.com

| Modell       | Input (1M tok) | Output (1M tok) | Cache hit | Kontekst | Bruk            |
| ------------ | -------------- | --------------- | --------- | -------- | --------------- |
| **V4 Pro**   | $0.435         | $0.87           | $0.0036   | 1M       | Primær fallback |
| **V4 Flash** | $0.14          | $0.28           | $0.0028   | 1M       | Rask, billig    |

> Merk: V4 Pro er 11x billigere enn GPT-5.5 og 6x billigere enn Claude Opus 4.8.

**Estimat ved aktiv bruk:** 3-5M input + 2M output per dag ≈ **$2-10/mnd**

---

### Sammenligning: Hva konkurrentene koster

| Modell                | Input/1M tok | Output/1M tok | vs Kimi K2.7 | vs DeepSeek V4 Pro |
| --------------------- | ------------ | ------------- | ------------ | ------------------ |
| **GPT-5.5**           | $5.00        | $30.00        | 5x dyrere    | 11x dyrere         |
| **Claude Opus 4.8**   | $5.00        | $25.00        | 5x dyrere    | 11x dyrere         |
| **Claude Sonnet 4.6** | $3.00        | $15.00        | 3x dyrere    | 7x dyrere          |
| **Gemini 3.1 Pro**    | $1.25        | $10.00        | 1.3x dyrere  | 3x dyrere          |

**Konklusjon:** Kimi K2.7 + DeepSeek V4 Pro er blant de billigste frontier-modellene. Du får 80-90% av GPT-5.5-ytelse til 10-20% av prisen.

---

## Infrastruktur-detaljer

### Cloudflare ($5/mnd — Workers Paid)

```
Cloudflare Workers Paid ......... $5.00/mnd
  ├─ Workers (app hosting)           ✅ Aktiv
  ├─ Zones (DNS)                     ✅ klarpakke.no (Free Website)
  ├─ Queues                          ❌ Ubrukt (1M ops/mnd inkl.)
  ├─ AI (Workers AI)                 ❌ Ubrukt (gratis tier)
  ├─ D1 (SQL)                        ❌ Ubrukt (5GB/25B rows inkl.)
  ├─ R2 (Storage)                    ❌ Ubrukt (10GB gratis)
  ├─ KV                              ❌ Ubrukt (1GB/10M reads)
  ├─ Analytics                       ❌ Ubrukt
  ├─ Durable Objects                 ❌ Ubrukt
  ├─ Hyperdrive                      ❌ Ubrukt
  └─ Images / Stream                 ❌ Ubrukt

Bruksgrad: ~15% (2 av 13 tjenester)
```

### Supabase ($25/mnd — Pro)

```
Supabase Pro ..................... $25.00/mnd
  ├─ Postgres (635MB av 8GB)         ✅ 635 MB aktiv
  ├─ Auth (email/OAuth)              ✅ Login/register
  ├─ pg_cron                         ✅ 3 aktive jobber
  ├─ REST API                        ✅ Auto-generert
  ├─ Edge Functions                  ⚠️ Kun cron-proxies
  ├─ Realtime                        ❌ Ubrukt (500 conn/5M msg inkl.)
  ├─ Storage                         ❌ Ubrukt (100GB inkl.)
  ├─ pg_vector                       ❌ Ubrukt
  ├─ Point-in-Time Recovery          ❌ Ubrukt (7 dager inkl.)
  ├─ Daily Backups                   ✅ Automatisk inkl.
  ├─ Read Replicas                   ❌ Ubrukt
  └─ Branching (Preview envs)        ❌ Ubrukt

Bruksgrad: ~25% (4 av 12 tjenester)
```

### GitHub ($0/mnd — Free)

```
GitHub Free ...................... $0.00/mnd
  ├─ Git hosting                     ✅ tajlive/KP
  ├─ Actions (CI/CD)                 ❌ Ubrukt (2000 min/mnd inkl.)
  ├─ Codespaces                      ❌ Ubrukt (120 core-timer)
  ├─ Dependabot                      ⚠️ Kjører, feiler ofte
  ├─ Code Scanning (CodeQL)          ❌ Ubrukt
  ├─ Secret Scanning                 ❌ Ubrukt (GRATIS — must-have)
  ├─ Projects (Kanban)               ❌ Ubrukt
  ├─ Packages                        ❌ Ubrukt
  └─ Pages                           ❌ Ubrukt

Bruksgrad: ~10% (1 av 9 tjenester)
```

---

## Kostnadsprojeksjon — 6 mnd

### Scenario A: Fortsett som nå

| Plattform    | Fast    | Variabelt  | Totalt/mnd |
| ------------ | ------- | ---------- | ---------- |
| Cloudflare   | $5      | —          | $5         |
| Supabase     | $25     | —          | $25        |
| GitHub       | $0      | —          | $0         |
| Kimi API     | —       | $5-15      | $10        |
| DeepSeek API | —       | $2-10      | $5         |
| **Sum**      | **$30** | **$10-25** | **$40-55** |

### Scenario B: Optimalisert (bruk eksisterende tjenester)

Samme kostnad — tar i bruk det du allerede betaler for:

- GitHub Actions CI/CD → auto-deploy, sparer 15 min per deploy
- Supabase Realtime → live UI-oppdateringer, 0 kr ekstra
- CF Workers AI → gratis AI på edge for signaler
- CF Queues → erstatt pg_cron HTTP-kall, mer pålitelig

### Scenario C: Skaler (når brukere vokser)

| Når          | Hva                    | +Mnd    |
| ------------ | ---------------------- | ------- |
| 100+ MAU     | GitHub Team            | +$4     |
| 500+ MAU     | Supabase Small Compute | +$10-15 |
| 10K+ req/dag | CF Workers overage     | +$0-5   |
| Profesjonell | GitHub Copilot         | +$10    |
| Tung AI-bruk | Kimi K3 økt bruk       | +$10-20 |

Maks neste 6 mnd: **$75-95/mnd** ved organisk vekst + AI-bruk.

---

## Oppsummering

| Hva                         | Beløp                          |
| --------------------------- | ------------------------------ |
| **Fast infrastruktur**      | $30/mnd ($360/år)              |
| **AI-modeller (variabelt)** | ~$10-25/mnd ($120-300/år)      |
| **Totalt nå**               | **~$40-55/mnd ($480-660/år)**  |
| **Bruksgrad infrastruktur** | ~18% av tilgjengelige features |
| **Umiddelbar forbedring**   | 4+ features, 0 kr ekstra       |
| **Maks neste 6 mnd**        | ~$95/mnd ved vekst             |

**AI-prisene dine er 80-90% lavere enn om du brukte GPT-5.5 eller Claude Opus.**
