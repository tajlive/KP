# Cursor Auto Agent-oppsett (Klarpakke)

Mål: gjøre Cursor Auto mer forutsigbar for Klarpakke ved å bruke riktig agent-kombinasjon per oppgavetype.

Dette oppsettet bygger på:
- `docs/agents/KLARPAKKE-ROSTER.md`
- `docs/agents/USER-SETTINGS-POLICY.md`
- `.agent/KLARPAKKE-AGENT-ROSTER.md`
- `.agent/workflows/*.md`

## 1) Standard profiler

Bruk disse profilene som faste "modus" i Cursor Auto.

### A) Product Build (default)
- Primær: `klarpakke-chief-architect` (arkitektur før kode)
- Sekundær: `klarpakke-ux-ui-agent`
- Kvalitet: `qa-automation-engineer`
- Formål: nye features, forbedringer i dashboard/trading/marketplace.

### B) Trading Integrity (live/paper/trades)
- Primær: `klarpakke-live-trading-trades-agent`
- Sekundær: `security-auditor`, `database-architect`
- Kvalitet: `qa-automation-engineer`
- Formål: alt som berører handler, RLS, sessions, Binance, historikk.

### C) Strategy Research (auto-trade)
- Primær: `klarpakke-auto-trade-strategy-research-agent`
- Sekundær: `klarpakke-experience-architect`
- Kvalitet: `qa-automation-engineer`
- Formål: strategi-logikk, presets, tuning, forklarbarhet.

### D) Release/Automation
- Primær: `klarpakke-automation-orchestrator`
- Sekundær: `devops-engineer`, `documentation-writer`
- Kvalitet: `qa-automation-engineer`
- Formål: CI/CD, MCP, verify, deploy-runbooks.

## 2) Routing-regler for Cursor Auto

Når oppgaven inneholder disse nøkkelordene, bruk denne profilen:

- `live trading`, `paper trading`, `trade`, `trading_sessions`, `RLS`, `binance` -> **Trading Integrity**
- `auto-trade`, `strategy`, `signal`, `preset`, `risk profile` -> **Strategy Research**
- `deploy`, `pipeline`, `mcp`, `linear`, `release`, `verify` -> **Release/Automation**
- `design`, `ux`, `ui`, `onboarding`, `dashboard`, `a11y` -> **Product Build**

Hvis flere matcher samtidig:
- prioriter **sikkerhet/data-integritet** over UI
- deretter **arkitektur**, deretter **presentasjon**

## 3) Fast arbeidssekvens (anbefalt)

Kjør samme rekkefølge hver gang for stabile leveranser:

1. **Kartlegg** berørte filer, API-ruter og migrasjoner.
2. **Planlegg** kort med risiko og testplan.
3. **Implementer** i små steg.
4. **Verifiser** med relevante tester.
5. **Dokumenter** endringer i passende SoT-dok.

## 4) Kvalitetsporter før "ferdig"

Minimum:
- `npm run lint`
- `npm run type-check`
- `npm run test:unit`

Ved trading-endringer:
- `npm run test:e2e:critical:chromium`
- oppdater `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` ved integritetsarbeid

Ved deploy/automasjon:
- `npm run automation:check`
- `npm run verify` (eller relevant prod/preview-verify)

## 5) Promptmaler for Cursor Auto

Bruk disse direkte som starttekst i Cursor Auto.

### Mal: Product Build
```md
Bruk Klarpakke Product Build-profilen.
Prioriter arkitektur, deretter UX/UI og til slutt implementasjon.
Følg eksisterende mønstre i src/app, src/components og src/lib.
Krev testplan og kjør lint/type-check/unit før levering.
```

### Mal: Trading Integrity
```md
Bruk Klarpakke Trading Integrity-profilen.
Prioriter data-integritet, RLS, idempotency og korrekt session/trade-flyt.
Ingen snarveier med service role i klient.
Kjør relevante tester og dokumenter bevis i trading SoT.
```

### Mal: Strategy Research
```md
Bruk Klarpakke Strategy Research-profilen.
Arbeid med strategi/presets/risk uten profitt-løfter.
Forklar trade-offs og gi trygg standardkonfig.
Legg ved test- og valideringsplan.
```

### Mal: Release/Automation
```md
Bruk Klarpakke Release/Automation-profilen.
Prioriter CI/MCP/verify, ryddig rollback-plan og oppdatert dokumentasjon.
Valider preflight og deploy-gates før ferdig.
```

## 6) Praktisk anbefaling for deg (Cursor Auto)

- Sett **Product Build** som daglig default.
- Bytt eksplisitt til **Trading Integrity** for alt som påvirker penger/handler.
- Bruk **Release/Automation** på slutten av større oppgaver.
- Hold oppgaver små nok til at verifikasjon faktisk kjøres hver gang.

## 7) Policy lock (må følges)

Følgende valg er låst via produktpolicy:
- målgruppe: småsparere 30-50, medium IT
- default mode: paper
- language default: norsk
- KPI-prioritet: upgrade conversion
- tiers: free/bachelor/master/phd-professor
- multi-exchange MVP+: Binance + Kraken (read-only Kraken først)
- risk UX: alltid synlig risiko + smart friksjon

Se detaljer i `docs/agents/USER-SETTINGS-POLICY.md`.
