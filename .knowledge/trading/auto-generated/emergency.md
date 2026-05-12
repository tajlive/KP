# emergency

**Fil:** `src/lib/trading/emergency.ts`
**Tester:** ❌ Nei

## Beskrivelse
Trading Emergency Controls
 
  VIKTIG: Disse funksjonene gir mulighet til å STOPPE all trading umiddelbart.
  Brukes ved systemfeil, mistenkt hacking, eller ekstreme markedsvolatilitet.
 
  Hvordan bruke:
  1. Via MCP verktøy: panic_close_all
  2. Via Admin Dashboard: Emergency Stop-knapp
  3. Via database: UPDATE global_settings SET emergency_stop = true

## Eksporterte funksjoner
- `checkEmergencyStatus()`
- `activateEmergencyStop()`
- `deactivateEmergencyStop()`
- `panicCloseAllPositions()`
- `canUserTrade()`
- `getEmergencyLogs()`

## Typer/Interfaces
- `EmergencyStatus`

## Konstanter
*Ingen eksporterte konstanter*

---
*Auto-generert av trading-knowledge-miner.mjs*
