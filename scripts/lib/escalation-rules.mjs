# Eskalasjons-protokoll for Klarpakke
# Versjon: 1.0.0
# Formål: Forhindre falske alarmer — kun varsle Tom ved faktisk kritisk

## Nivåer

| Nivå | Kriterium | Handling | Kanal |
|------|-----------|----------|-------|
| **INFO** | Systemet fungerer, noe er suboptimalt | Logg til fil, ikke varsle | `logs/info.log` |
| **WARNING** | Kan bli kritisk, krever oppmerksomhet | Trello-kort i «Varsler» | Trello API |
| **CRITICAL** | Penger i fare, eller prod nede | Trello + DM til Tom | Trello + Slack/Discord |
| **EMERGENCY** | Tap av penger, sikkerhetsbrudd | Alle kanaler + stopp trading | Telefon + alle over |

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
  INFO: { notify: false, trello: false, dm: false },
  WARNING: { notify: true, trello: true, dm: false },
  CRITICAL: { notify: true, trello: true, dm: true },
  EMERGENCY: { notify: true, trello: true, dm: true, phone: true },
};

export function classify(result) {
  // Cron succeeded but empty
  if (result.cronSucceeded && result.rowsProcessed === 0) {
    return { level: 'WARNING', reason: 'Cron kjører men har ingenting å gjøre' };
  }
  
  // Cron failed multiple times
  if (result.cronFailedCount >= 3) {
    return { level: 'CRITICAL', reason: 'Cron feilet 3+ ganger' };
  }
  
  // API error
  if (result.httpStatus >= 500) {
    return { level: 'CRITICAL', reason: `API feil: ${result.httpStatus}` };
  }
  
  // Data quality issue
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

if (ESCALATION[level].trello) {
  await createTrelloCard({ title: reason, list: 'Varsler' });
}

if (ESCALATION[level].dm) {
  await sendDM({ to: 'tom', message: reason });
}
```

## Versjonering

- 1.0.0 (2026-08-09): Første versjon — forhindrer falske alarmer fra autopilot-watchdog
