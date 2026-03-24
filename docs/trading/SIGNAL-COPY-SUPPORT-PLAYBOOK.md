# Signal + Copy support playbook

## Formål

Gi support et fast beslutningstre for signal-feed og copy discover uten SQL-tilgang.

## 1) Signal-feed beslutningstre

1. Sjekk `GET /api/health` -> `checks.tradingSignals`.
2. Les `checks.tradingSignals.details.feedStateHint`.

Tolkning:

- `live`: normal drift.
- `stale`: trolig HOLD-periode, verifiser heartbeat alder.
- `demo`: fallback-data vises, sjekk signal-engine pipeline.
- `empty`: ingen signalrader ennå, sjekk strategiaktivitet.
- `error`: driftsfeil, eskaler incident.

## 2) Discover beslutningstre

`GET /api/copy-trading/discover`:

- `401`: bruker ikke innlogget/sesjon utløpt.
- `reason=no_public_traders`: ingen aktive `leaderboard_bots`/offentlige profiler.
- `reason=partial_data`: delvis datatilgang; vis liste men varsle drift.
- `reason=backend_error`: API-feil; retry + incident hvis vedvarende.

## 3) Før eskalering (support)

- Be bruker oppdatere siden.
- Bekreft korrekt URL (`/no/...` eller `/en/...`) og innlogging.
- Bekreft plan hvis forventning er Master-detaljer i full signal-feed.

## 4) Eskalering til drift

Lag incident når:

- `feedStateHint=error`, eller
- heartbeat > 40 min, eller
- discover `backend_error` vedvarer over 15 min.

Inkluder:

- tidspunkt
- URL
- health payload
- brukerens plan + route.
