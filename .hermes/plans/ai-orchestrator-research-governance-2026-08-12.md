# AI Orchestrator — Research Governance Specification 2026-08-12

> **Status:** Designspesifikasjon. IKKE implementert.
> **Prinsipp:** AI-en skal være revisor og bibliotekar — aldri trader.

---

## 1. Tillatte handlinger

| #   | Handling               | Beskrivelse                                                                                        |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | **startBacktest**      | Starte en forhåndsgodkjent backtest (må matche en protokoll i `.hermes/plans/`)                    |
| 2   | **validateResultFile** | Validere at en resultatfil har: periode, kostnader, git SHA, commit, korrekt `days`/`candles`      |
| 3   | **compareToWebsite**   | Sammenligne tall på nettsiden med committede resultatfiler — flagge avvik                          |
| 4   | **auditClaim**         | Motta en påstand (f.eks. "+433% SOL") og spore den til primærkilde eller erklære den uverifiserbar |
| 5   | **explainRegime**      | Forklare nåværende markedsregime til bruker på norsk                                               |
| 6   | **explainRisk**        | Forklare risiko ved en strategi basert på committede backtest-data                                 |
| 7   | **suggestResearch**    | Foreslå (ALDRI aktivere) en ny forskningsvariant basert på observerte svakheter                    |

## 2. FORBUDTE handlinger (harde grenser)

| #   | Forbudt handling                                    | Konsekvens ved brudd                                     |
| --- | --------------------------------------------------- | -------------------------------------------------------- |
| 1   | Velge eller sende handler                           | Systemet nekter — ingen API-tilgang                      |
| 2   | Endre live- eller paper-config                      | Systemet nekter — skrivebeskyttet DB-tilgang             |
| 3   | Sette API-nøkler eller secrets                      | Systemet nekter — ingen tilgang til `.env.local`         |
| 4   | Deploye                                             | Systemet nekter — ingen wrangler/CI-tilgang              |
| 5   | Endre tall på nettsiden                             | Systemet nekter — read-only filsystem                    |
| 6   | Presentere uverifiserte tall som fakta              | Hard brudd — påstand MÅ ha primærkilde i committet fil   |
| 7   | Kjøre ny backtest uten forhåndsregistrert protokoll | Systemet nekter — protokoll MÅ finnes i `.hermes/plans/` |
| 8   | Aktivere en strategi for paper eller live           | Systemet nekter — dette er Toms beslutning alene         |

## 3. Arkitektur

```
┌─────────────────────────────────────────────────┐
│                  AI Orchestrator                 │
│  (leser filer, validerer data, skriver rapporter)│
└──────────┬──────────────────────┬────────────────┘
           │                      │
    ┌──────▼──────┐       ┌──────▼──────┐
    │  File System │       │  Supabase   │
    │  (read-only) │       │  (read-only)│
    └──────────────┘       └─────────────┘
```

- **Ingen tilgang** til: wrangler CLI, Cloudflare API, OKX/Kraken API, CI/CD
- **Skrivebeskyttet** DB-tilgang (kun SELECT, ingen INSERT/UPDATE/DELETE)
- **Skrivebeskyttet** filsystem (kun lese `.hermes/`, `backtest-results-*.json`, `src/`)

## 4. Verifiseringspipeline

Hver gang Orchestratoren presenteres et tall:

```
1. Hent påstanden (f.eks. "+433% SOL 5-års")
2. Søk i .hermes/verifisering-*.md for tidligere verifisering
3. Søk i backtest-results-*.json for primærkilde
4. Hvis primærkilde finnes: verifiser at tallene stemmer
5. Hvis IKKE: erklær "UVERIFISERBAR — ingen primærkilde funnet"
6. Skriv funn til .hermes/reports/
```

## 5. Eksempel: Audit av "+433% SOL"

```
INPUT: "Strategien ga +433% på SOL over 5 år"
OUTPUT:
  ⚠️ UVERIFISERBAR
  - Scriptet run-full-cycle.mjs aldri committet
  - Ingen output-fil funnet for SOL 5-års
  - Nærmeste bekreftede data: backtest-results-sol-verified-2026-08-12.json
    → SOLUSDT 1-års: −21.6%, PF 0.34
  - Se .hermes/verifisering-433pct-2026-08-12.md for full rapport
```

## 6. Minimumsimplementasjon (MVP)

- **Én TypeScript-fil:** `src/lib/ai/orchestrator.ts`
- **Én funksjon:** `auditClaim(claim: string): AuditResult`
- **Ingen LLM-kall** i MVP — rent regelbasert filsøk + JSON-validering
- **Output:** strukturert resultat med `verdict: "verified" | "unverifiable" | "contradicted"` + kildehenvisning

## 7. Utvidelsesplan (IKKE i denne oppgaven)

- LLM-basert forklaring av regime til sluttbruker (krever norsk språkmodell)
- Automatisk deteksjon av avvik mellom `backtest-bevis.json` og faktiske backtest-resultater
- Integrasjon med Trello for automatisk «bevis levert»-kommentar

---

## Forfatter

Hermes (DeepSeek V4 Pro) · Klarpakke · 2026-08-12
