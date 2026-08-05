# A/B-plan — Grid som default-ruting (Task 8, plan 2026-08-05)

**Status:** Task 7 (kode) er implementert og committet (`d54aa6a76`) — **IKKE deployet**.
**Gate-regel (trading-agent-skillen):** ALDRI deploy uten at alle gates er grønne. Siste gate = 48t paper A/B.

---

## 1. Hva endres (allerede i kode, bak flagg)

`src/app/api/pilot/route.ts` + `src/lib/trading/routing-default.ts`:
- `GRID_DEFAULT_ROUTING="off"` → gammel oppførsel (auto → `multi_signal`, pilot → `cryptopilot`)
- Flag udefinert / annen verdi → **grid** for alle nye auto/pilot-sesjoner
- Gjelder BÅDE `trading_sessions.strategy_id` OG `auto_trading_configs.strategy`

## 2. A/B-design (48t)

| Arm | Oppsett | Måling |
|---|---|---|
| **Grid (ny default)** | `GRID_DEFAULT_ROUTING` udefinert (ON) | Nye sesjoner med `strategy_id='grid'` |
| **Kontroll** | `GRID_DEFAULT_ROUTING=off` på én env-klone eller via bruker-hash | Nye sesjoner med `multi_signal`/`cryptopilot` |

**Arm-tildeling:** enklest og tryggest = tid-fase (48t grid ON → sammenlign mot historiske multi_signal-sesjoner fra samme periode-forrige-uke) ELLER bruker-hash mod 2. Planen anbefaler **tid-fase** — null ekstra kode, ingen DB-endring, og multi_signal har uansett negativ fasit (PF 0,60) så kontroll-armen er veldokumentert historisk.

## 3. Målepunkt (SQL, etter 48t)

```sql
-- Grid-armen (nye sesjoner, siste 48t)
SELECT count(*) FILTER (WHERE realized_pnl > 0) AS wins,
       count(*) FILTER (WHERE realized_pnl < 0) AS losses,
       sum(realized_pnl) AS pnl,
       sum(realized_pnl) FILTER (WHERE realized_pnl > 0)
         / NULLIF(abs(sum(realized_pnl) FILTER (WHERE realized_pnl < 0)),0) AS profit_factor
FROM trades t JOIN trading_sessions s ON s.id = t.session_id
WHERE s.strategy_id = 'grid'
  AND t.executed_at > now() - interval '48 hours'
  AND t.status = 'filled';
-- Bruk cleanTradeStats/getCleanTrades (CONTAMINATION_CUTOFF) for visning
```

## 4. Stopp-kriterier

| Metrikk | Terskel | Handling |
|---|---|---|
| Profit factor (grid-arm) | < 1,3 | Revert flagg → `GRID_DEFAULT_ROUTING=off` |
| Win rate (grid-arm) | < 40 % | Revert flagg → `GRID_DEFAULT_ROUTING=off` |
| Max drawdown (grid-arm) | > 15 % | Revert + kill-gjennomgang |

## 5. Deploy-sekvens

1. Sett `GRID_DEFAULT_ROUTING` til udefinert i prod-env (cloudflare secret) → grid ON
2. Overvåk 48t via daglig analyse + trading-agent-ukesrapport
3. Grønne gates → **hardkode** grid (fjern flagg-fallback, behold `isGridDefaultRouting()` med default true — flagget forblir bare for nød-revert)
4. Rød gate → sett flagg `off`, re-evaluer

## 6. Rollback

- Ett sekund: `npx wrangler secret put GRID_DEFAULT_ROUTING` → `off` + deploy
- Eksisterende grid-sesjoner påvirkes IKKE (endringen gjelder kun NYE sesjoner)
- Ingen DB-migrasjon involvert

---
*Task 8 — A/B-plan klar. Task 7 kode klar. Vent på deploy-beslutning (Tom/Hermes-hovedøkten).*
