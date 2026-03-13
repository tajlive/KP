# Neste trinn før lansering (arkitekt 2026-03-13)

Sammendrag fra arkitekt-sesjon. Linear-oppgaver er opprettet.

## P0 (før prod)

| Linear | Oppgave |
|--------|--------|
| [KLA-165](https://linear.app/klarpakke/issue/KLA-165) | **RLS på 8 tabeller** – auto_trades, trade_history, trading_risk_config, _trigger_debug, saved_strategies, notification_preferences, user_activity_logs, beta_feedback. Start med trading-core. |
| [KLA-168](https://linear.app/klarpakke/issue/KLA-168) | **Sentry prod** – verifiser at error events mottas fra Vercel (DSN + env). |
| [KLA-167](https://linear.app/klarpakke/issue/KLA-167) | **Bygg-timeout** – reduser build-tid under 300s for CI/CD. |

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
