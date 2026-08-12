# Eskalasjons-protokoll for Klarpakke — Arch Alert Layer
# Versjon: 2.0.0 (2026-08-12, KLA-279 — Trello fjernet, Linear er eneste kanal)
# Formål: Forhindre falske alarmer — kun varsle ved faktisk kritisk hendelse.

## Arkitektur

```
Hendelse (Sentry / CI / Monitoring / Cron / Security / Deploy)
  → Arch Alert Layer (fingerprint + severity-mapping)
  → Linear Issue (label incident, idempotent)
  → Hermes Agent → Fix / Verify / Evidence → Done
```

## Nivåer

| Nivå | Kriterium | Handling | Kanal | Linear-priority |
|------|-----------|----------|-------|-----------------|
| **INFO** | Systemet fungerer, noe er suboptimalt | Logg til fil, ikke varsle | `logs/info.log` | — |
| **WARNING** | Kan bli kritisk, krever oppmerksomhet | Linear-issue (incident) | Linear | 2 |
| **CRITICAL** | Penger i fare, eller prod nede | Linear-issue urgent (incident + p0) + DM til Tom | Linear + Discord/DM | 1 |
| **EMERGENCY** | Tap av penger, sikkerhetsbrudd | Linear p0 + Tom-approval (stopp trading) | Linear + alle kanaler | 0 (urgent) |

## Regler per scenario

| Scenario | Nivå | Begrunnelse |
|----------|------|-------------|
| Cron succeeded men ingen data | **WARNING** | Systemet kjører, men har ingenting å gjøre |
| Cron failed 1 gang | **INFO** | Transient feil, retry neste kjøring |
| Cron failed 3+ ganger | **CRITICAL** | Systemet er faktisk nede |
| API returnerer 200 men feil data | **WARNING** | Datakvalitet, ikke nedetid |
| API returnerer 5xx | **CRITICAL** | Faktisk nedetid |
| DB-invariant brutt | **WARNING** | Inkonsistens, ikke nødvendigvis feil |
| Live-trading feilet | **CRITICAL** | Penger involvert |
| Kraken lockout | **WARNING** | Forventet oppførsel, backoff håndterer |
| Watchdog selv feiler | **WARNING** | Blind spot, ikke kritisk |

## Implementasjon

```javascript
// scripts/lib/escalation-rules.mjs
export const ESCALATION = {
  INFO:      { log: true,  linear: false, linearPriority: 0,  tomApproval: false },
  WARNING:   { log: false, linear: true,  linearPriority: 2,  tomApproval: false },
  CRITICAL:  { log: false, linear: true,  linearPriority: 1,  tomApproval: false, dm: true },
  EMERGENCY: { log: false, linear: true,  linearPriority: 0,  tomApproval: true,  dm: true },
};

export function classify(result) {
  if (result.cronSucceeded && result.rowsProcessed === 0) {
    return { level: 'WARNING', reason: 'Cron kjører men har ingenting å gjøre' };
  }

  if (result.cronFailedCount >= 3) {
    return { level: 'CRITICAL', reason: 'Cron feilet 3+ ganger' };
  }

  if (result.httpStatus >= 500) {
    return { level: 'CRITICAL', reason: `API feil: ${result.httpStatus}` };
  }

  if (result.httpStatus === 200 && result.dataInconsistent) {
    return { level: 'WARNING', reason: 'Data inkonsistent' };
  }

  return { level: 'INFO', reason: 'Alt OK' };
}
```

## Bruk i watchdog

```javascript
import { classify, ESCALATION } from './lib/escalation-rules.mjs';

const result = await checkOrchestrator();
const { level, reason } = classify(result);
const rule = ESCALATION[level];

if (rule.linear) {
  await postLinearAlert({
    title: reason,
    fingerprint: `watchdog:orchestrator:${reason}`,
    severity: level.toLowerCase(),
    priority: rule.linearPriority,
    tomApproval: rule.tomApproval,   // EMERGENCY: flytt til Ready for Tom, aldri Approved
  });
}

if (rule.dm) {
  await sendDM({ to: 'tom', message: reason });
}
```

## Arch alert-format (felles for alle sinks)

Alle Linear-alerts bærer en maskinlesbar markør i beskrivelsen:

```
<!--arch-alert
fingerprint: <kilde>:<stabil-id>
source: <ci|monitor|webhook|cron>:<navn>
severity: info|warning|critical|emergency
-->
```

Fingerprint = dedupliseringsnøkkel. Søk på `description contains "<fingerprint>"`
mot ÅPNE issues (`state.type neq completed`) før opprettelse — samme hendelse gir
aldri to issues. Alert-feil skal aldri krasje hovedsystemet (fail-safe).

## Versjonering

- 2.0.0 (2026-08-12, KLA-279): Trello fjernet — Linear issue/urgent + Tom-approval-modell, Arch alert-format med fingerprint.
- 1.0.0 (2026-08-09): Første versjon — forhindrer falske alarmer fra autopilot-watchdog.
