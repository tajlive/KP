# E2E Test Suite for Paper Trading

## Oppsett

1. Kopier test filer til prosjektet:
```bash
cp audit/tests/paper-trading.e2e.test.ts src/__tests__/integration/
```

2. Kjør testene:
```bash
npm run test:e2e -- paper-trading.e2e.test.ts
```

## Forventede Resultater

### Før Fix
- Cron tick prosesserer IKKE auto_trading_sessions

### Etter Fix
- Cron tick prosesserer begge session typer
