# Session Crash Investigation (2026-07-29)

## Problem

Etter JokerTrade-v4 re-deployment opplevde Tom (og andre brukere) at sessions ble markert `status = 'crashed'` etter vellykkede handler. `ensureActiveSession()` gjenoppretter ved å stoppe crashed sessions og opprette nye, men rotårsaken er fortsatt ukjent.

## Hva vi vet

- **15 tomme crashed sessions** ble funnet (`deleted_at > NOW() - 2 hours`). De hadde 0 trades.
- **4 sessions med trades** (Tom: 4 stk, 1-4 handler hver). Capital var positiv (47k-86k), ikke 0.
- Session-cleanup-koden stopper sessions etter failed trades — men disse HADDE vellykkede handler.

## Hva vi har utelukket

| Kilde | Konklusjon |
|-------|-----------|
| `trigger_update_session_state` | Oppdaterer KUN current_capital, current_capital_nok, open_position, trades — setter IKKE status |
| `execute-trade.ts` | Inneholder ingen `status = 'crashed'` oppdatering |
| `heal_stale_sessions()` RPC | RECOVERS crashed sessions (setter tilbake til 'active'), lager dem IKKE |
| CHECK constraint | `current_capital >= 0` — ville bare blokkere UPDATE, ikke endre status |
| Default verdi | `status` har default `'active'` — ingen INSERT setter 'crashed' |
| `ensureActiveSession()` | Setter `status: 'active'` eksplisitt |

## Mulige syndere (ikke bekreftet)

1. **Tick cron** (`/api/cron/tick`) — har `.update({ status: "stopped", ... })` ved feil, men OGSÅ har logikk for å reaktivere crashed. MULIGENS setter den status til crashed et sted vi ikke fant.
2. **Session restart API** — `PATCH /api/trading/sessions` med `status: 'crashed'` — en frontend-komponent eller brukerhandling kan trigge dette.
3. **DB default + race condition** — hvis en INSERT feiler (constraint) og deretter en UPDATE setter status til crashed via et annet kodepath.

## Midlertidig fiks

`ensureActiveSession()` gjenbruker aktiv session hvis én finnes. Hvis ingen finnes (alle er crashed/stopped), opprettes ny. Session-cleanup stopper sessions uten handler.

## Åpent spørsmål

HVA setter `trading_sessions.status = 'crashed'`? Ingen av oss har funnet koden som gjør det. Neste steg: legg til audit-logging på `trading_sessions.status` endringer for å fange syndebukken.
