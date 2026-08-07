# Klarpakke Infrastruktur-audit — Hva du betaler for vs hva du bruker

> Oppdatert 2026-08-07. $30/mnd totalt ($5 CF + $25 Supabase + GitHub).

---

## Cloudflare Workers Paid ($5/mnd)

| Service             | Bruker?         | Verdi                                                                                             | Prioritet |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------- | --------- |
| **Workers**         | ✅ prod         | Applikasjonshosting                                                                               | —         |
| **DNS**             | ✅ klarpakke.no | Domene                                                                                            | —         |
| **Queues**          | ❌              | Erstatt pg_cron HTTP-kall. 1M ops/mnd inkl. → gratis. Mer pålitelig enn pg_cron→HTTP              | 🔴 P0     |
| **AI (Workers AI)** | ❌              | Kjør Llama/Mistral på Edge — trading-signaler, sentiment-analyse. Gratis raus tier (100+ req/dag) | 🔴 P0     |
| **Analytics**       | ❌              | Dashboard: requests, feil, latency. Forstå brukermønstre                                          | 🟡 P1     |
| **R2**              | ❌              | Objektlagring — erstatt Supabase Storage. 10 GB gratis. $0.015/GB-mnd deretter                    | 🟡 P1     |
| **D1**              | ❌              | Edge-nært SQL for trading-data (cache). 5 GB + 25B rows/mnd inkl.                                 | 🟢 P2     |
| **KV**              | ❌              | Key-value cache for pris-data, sessions. 1 GB + 10M reads inkl.                                   | 🟢 P2     |
| **Hyperdrive**      | ❌              | Database-akselerator. Koble Supabase → edge. Reduserer latency                                    | 🟢 P2     |

### Raskeste gevinster:

1. **Cloudflare AI** → AI-drevne trading-signaler og sentiment-analyse. Gratis. Edge-nært.
2. **Cloudflare Queues** → Erstatt pg_cron HTTP calls. Mer pålitelig. Gratis.
3. **Analytics** → Slå på. Gir dashboards. Gratis.

---

## Supabase Pro ($25/mnd)

| Service            | Bruker?      | Verdi                                                             | Prioritet |
| ------------------ | ------------ | ----------------------------------------------------------------- | --------- |
| **Postgres**       | ✅ 635MB/8GB | Database                                                          | —         |
| **Auth**           | ✅           | Login/register                                                    | —         |
| **pg_cron**        | ✅           | Orkestrator + sync                                                | —         |
| **Edge Functions** | ⚠️ Delvis    | Kun cron-proxies. Ikke brukt til forretningslogikk                | 🟡 P1     |
| **Realtime**       | ❌           | WebSocket-push til klienter. Live pris-oppdateringer UTEN polling | 🔴 P0     |
| **Storage**        | ❌           | Filopplasting (avatar, kvitteringer, exports). 100 GB inkl.       | 🟡 P1     |
| **pg_vector**      | ❌           | Vektor-søk for AI. Semantisk matching av trading-mønstre          | 🟡 P1     |
| **Read Replicas**  | ❌           | Dedikert lese-node. Reduserer load på hovedbasen                  | 🟢 P2     |
| **Branching**      | ❌           | Preview-miljøer per PR. Isolert testdata                          | 🟢 P2     |

### Raskeste gevinster:

1. **Realtime** → Pris-oppdateringer, ordre-status, fills i sanntid. Uten polling. Inkludert.
2. **Edge Functions** → Flytt trading-logikk hit (nærmere brukerne i Europa).
3. **pg_vector** → AI-matching av trading-mønstre mot historisk data.

---

## GitHub (Team? $4-21/mnd)

| Service             | Bruker? | Verdi                                                                  | Prioritet |
| ------------------- | ------- | ---------------------------------------------------------------------- | --------- |
| **Git hosting**     | ✅      | tajlive/KP                                                             | —         |
| **Actions**         | ❌      | CI/CD pipeline. 3000 min/mnd inkl. → auto-lint, auto-test, auto-deploy | 🔴 P0     |
| **Dependabot**      | ⚠️      | Kjører men feiler ofte — ingen fikser merges                           | 🟡 P1     |
| **Code Scanning**   | ❌      | CodeQL sikkerhetsanalyse. Gratis for public repos                      | 🟡 P1     |
| **Secret Scanning** | ❌      | Blokker API-nøkler fra commits. GRATIS. Høy verdi                      | 🔴 P0     |
| **Copilot**         | ❌      | AI-kodeassistent. $10/mnd                                              | 🟢 P2     |
| **Projects**        | ❌      | Kanban-tavle for roadmap                                               | 🟢 P2     |

### Raskeste gevinster:

1. **CI/CD pipeline** → `git push` → auto-deploy. Sparer 5+ min per deploy.
2. **Secret Scanning** → Blokkerer at API-nøkler commites. Gratis. Livredder.
3. **Code Scanning** → Automatisk sikkerhetsanalyse. Gratis.

---

## Implementeringsplan — 4 raske gevinster (0 kr ekstra)

| #   | Hva                                | Tid     | Effekt                                           |
| --- | ---------------------------------- | ------- | ------------------------------------------------ |
| 1   | **GitHub Actions CI/CD**           | 1 time  | `git push` → auto deploy. Slutt på manuelle bygg |
| 2   | **Supabase Realtime**              | 2 timer | Live pris-oppdateringer, fills i sanntid         |
| 3   | **Cloudflare AI trading-signaler** | 3 timer | Gratis AI på Edge → bedre entry/exit             |
| 4   | **GitHub Secret Scanning**         | 5 min   | Push-beskyttelse. Skru på i repo settings        |

**Samlet:** Alle 4 er kostnadsfrie. ~6 timer arbeid. Umiddelbar verdi.
