# Klarpakke Autopatch Kontrakt

> **Versjon:** 1.0  
> **Status:** Påkrevd for alle KIMI/agents  
> **Gjelder fra:** 2026-03-28

---

## Prinsipp: Ingen Manuelle Patch-Oppgaver

Klarpakke aksepterer **aldri** manuelle patch-instruksjoner. Enhver agent (KIMI, Claude, Cursor, etc.) skal:

1. **Automatisere fullstendig** — ingen "rediger i editor", "gjør dette manuelt", eller tilsvarende
2. **Stoppe eksplisitt** hvis automatisk løsning ikke er mulig, med maskinlesbar feil
3. **Bruke AST-verktøy** for TypeScript-endringer fremfor regex der det er mulig

---

## Standard Flyt for Patches

```
Patch-forslag
    ↓
AST-verifisering (npm run verify:ts-ast)
    ↓
Full type-check (npm run type-check)
    ↓
Målrettede tester (relatert til endrede filer)
    ↓
Stage kun relevante filer
    ↓
Commit med beskrivende melding
```

---

## Forbudte Praksiser

| Forbudt | Grunn | Alternativ |
|---------|-------|------------|
| Regex-baserte TS-patcher i kritiske filer | Uforutsigbare, kan introdusere syntaksfeil | Bruk ts-morph / AST-verktøy |
| "Åpne filen i editor og..." | Bryter automatiseringskontrakt | Script som leser/skriver direkte |
| "Kjør denne kommandoen og fiks manuelt" | Delvis automatisering er ikke godt nok | Fullstendig script |
| Stage av urelaterte filer | Forurenser commit-historikk | Kun endrede + nye filer |

---

## Kritiske Filer som Krever AST-Guardrail

Følgende paths trigger automatisk `verify:ts-ast` i pre-commit:

- `src/lib/ai/sonar/` — AI/ML trading logikk
- `src/lib/trading/` — Kjerne trading-motor
- `src/app/api/signal/` — Signal API endpoints
- `scripts/` — Automatiseringsscripts

---

## Håndtering av Blockers

Hvis en oppgave ikke kan fullføres automatisk:

1. **Ikke** foreslå manuelle steg
2. **Rapporter** tydelig hva som blockerer
3. **Foreslå** alternativ automatisk vei hvis mulig
4. **Avslutt** med exit code ≠ 0 og maskinlesbar feilmelding

Eksempel på god blocker-rapport:
```
❌ [BLOCKED] Kan ikke automatisere: Krever OAuth-token som ikke er tilgjengelig i env.
   Løsning: Sett GITHUB_TOKEN i .env.local og kjør på nytt.
   Exit code: 1
```

---

## Verktøy som Skal Brukes

| Scenario | Verktøy | Kommando |
|----------|---------|----------|
| TypeScript verifisering | ts-morph | `npm run verify:ts-ast` |
| Full type-sjekk | tsc | `npm run type-check` |
| Enhetstester | vitest | `npm run test:unit` (targeted) |
| E2E-tester | playwright | `npm run test:e2e:critical` |

---

## Vedlikehold

Denne kontrakten oppdateres kun via PR med:
1. Endring i `docs/automation/autopatch-contract.md`
2. Eventuelle kodeendringer som støtter nytt prinsipp
3. Review av minst én annen agent/utvikler

---

*Sist oppdatert: 2026-03-28*  
*Eier: Klarpakke DevX Team*
