---
description: Klarpakke OMP sticky rules and KIMI tuning reference. Apply to every turn.
alwaysApply: true
---

# Klarpakke OMP Sticky Rules

- Use OMP-native project config only. Do not add or depend on Cursor, Antigravity, Claude, Gemini, Copilot, `.cursor/rules`, `.claude`, or `.agent` routing for new work.
- `.kimi/MASTER_PROMPT.md` is the project source of truth; `.kimi/WORKFLOW_RULES.md` governs production/deploy workflow.
- GitHub is source of truth; production is Cloudflare Workers/OpenNext/Wrangler. Vercel is legacy and must not be assumed.
- Do not commit secrets. Do not disable RLS as a shortcut. Do not put service-role credentials in client code.
- Do not delete or alter `.kimi/`, `.agent/`, `CLAUDE.md`, or `.github/`; OMP disables their discovery instead.
- For live/paper trading, trades, sessions, Binance, tier, RLS, or trade history work: maintain full context, full evidence, and update `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` after verification.
- Cross-cutting, full-stack implementation work goes to `klarpakke-coder`; narrow specialist work goes to the relevant `klarpakke-*` agent.

## KIMI 2.7 Code / OMP 16.3.6 tuning

This project is tuned for KIMI 2.7 Code. The authoritative project overlay lives in `.omp/config.yml`; the values below explain the intent:

- High thinking for architect/integrity roles; medium for task/smol work.
- Native KIMI tool format (`tools.format: kimi`) for reliable tool-use fidelity.
- `task.maxConcurrency: 4` with `eager: always` balances M1 responsiveness with parallel subagent work.
- Specialist agents default to `thinkingLevel: high` except `klarpakke-cockpit-qa` (`medium`).
- `klarpakke-coder` is the full-stack generalist; it delegates to narrow specialists when one domain dominates.
- KIMI 2.7 Code API keys are configured in `~/.omp/agent/models.yml` or user-local secret stores (e.g., `.env.local`); never commit them.
