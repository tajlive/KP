# Arch Knowledge Graph — F1

Dato: 2026-08-12 · Klarpakke = referanseprosjekt #1 · Seed-kilde: drift av Klarpakke (august 2026)

## Hensikt

Kunnskapslaget gjør læring **maskinlesbart og prosjekt-arvelig**. Når Hermes løser et problem,
går rotårsak + fiks inn i `failures/`, generaliserbare løsninger i `patterns/`, og
avledede tommelfingerregler i `lessons/`. Neste `arch project init` arver dette automatisk.

## Struktur

```
knowledge/
├── decisions/      # godkjente arkitekturbeslutninger (D-XXXX)
├── patterns/       # gjenbrukbare løsningsmønstre (build-blokker)
├── failures/       # læringsdatabase: symptom → rotårsak → fiks → permanent regel
├── customers/      # kundeprofil per prosjekt
├── architectures/  # gjeldende arkitektur per prosjekt
└── lessons/        # tommelfingerregler avledet fra failures
```

## Formater (standardisert)

### Decisions (`decisions/D-XXXX.md`)

```markdown
# D-XXXX

Dato:
Prosjekt:
Beslutning:

Hvorfor:
Alternativer vurdert:

Konsekvens:

Godkjent av:
```

### Failures (`failures/<navn>.md`) — det mest verdifulle

```markdown
# Failure

System:
Dato:

Symptom:
Rotårsak:
Fix:
Permanent regel:

Arvet av:
```

### Patterns (`patterns/<navn>.md`)

```markdown
# Pattern

Bruk når:
Implementasjon:
Regler:
```

## Læringsløkken

```
Hermes løser et problem
    │  (rotårsak + fiks + verifiseringsbevis)
    ├─→ knowledge/failures/<id>.md    (alltid)
    ├─→ knowledge/patterns/<id>.md    (hvis generaliserbar)
    └─→ templates/ oppdateres         (hvis standard for nye prosjekter)
```

## Governance-regel (Tom-mandat, F1)

**«Arch lærer av systemet, men endrer aldri sikkerhetsgrenser automatisk.»**

AI kan foreslå «dette bør bli standard», men aldri automatisk:

- ❌ endre risk-regler
- ❌ aktivere trading
- ❌ endre secrets
- ❌ endre tilgangsnivå

Full policy: `.arch/policies.yaml` → `knowledge_governance`.

## Index

- **decisions/** — 7 beslutninger (D-2026-08-12-01 … -07)
- **failures/** — 6 rotårsak-rapporter (Honcho, paper-inflasjon, CF-edge, QueryClientProvider, Trello-kirkegård, pre-commit)
- **patterns/** — 4 byggeblokker (alert-dedup, watchdog, secret-resolve, fail-closed)
- **lessons/** — 4 tommelfingerregler
- **customers/** — Klarpakke (referansekunde)
- **architectures/** — Klarpakke (gjeldende arkitektur)
