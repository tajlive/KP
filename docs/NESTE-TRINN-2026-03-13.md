# Neste trinn før lansering (arkitekt 2026-03-13)

Sammendrag fra arkitekt-sesjon. Linear-oppgaver er opprettet.

## P0 (før prod) — fullført 2026-03-15

| Linear | Oppgave | Status |
|--------|--------|--------|
| [KLA-165](https://linear.app/klarpakke/issue/KLA-165) | **RLS på 8 tabeller** | Done |
| [KLA-168](https://linear.app/klarpakke/issue/KLA-168) | **Sentry prod** | Done |
| [KLA-167](https://linear.app/klarpakke/issue/KLA-167) | **Bygg-timeout** | Done |
| [KLA-164](https://linear.app/klarpakke/issue/KLA-164) | **USDT/NOK valuta** | Done |
| [KLA-162](https://linear.app/klarpakke/issue/KLA-162) | **user_profiles join** | Done |
| [KLA-157](https://linear.app/klarpakke/issue/KLA-157) | **Paper + Auto trade DB** | Done |
| [KLA-158](https://linear.app/klarpakke/issue/KLA-158) | **FINAL PRODUCTION FIX** | Done (verify passert) |

## P1 (etter lansering)

| Linear | Oppgave |
|--------|--------|
| [KLA-166](https://linear.app/klarpakke/issue/KLA-166) | **Type-gjeld** – rydde TS gradvis, deretter slå tilbake `typescript.ignoreBuildErrors` (DECISIONS-2026). |

## Anbefalt rekkefølge

1. RLS-migrasjon for `auto_trades` og `trade_history` først (KLA-165).
2. Sentry prod (KLA-168).
3. Resten av RLS + bygg-timeout (KLA-165, KLA-167).
4. Type-gjeld etter lansering (KLA-166).

## Referanser

- `docs/DECISIONS-2026.md`
- `docs/RLS-AUDIT-2026-03-13.md`
- Handover: `docs/PERPLEXITY-CONTEXT.md`
