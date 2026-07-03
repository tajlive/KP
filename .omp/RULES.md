# Klarpakke OMP Sticky Rules

- Use OMP-native project config only. Do not add or depend on Cursor, Antigravity, Claude, Gemini, Copilot, `.cursor/rules`, `.claude`, or `.agent` routing for new work.
- `.kimi/MASTER_PROMPT.md` is the project source of truth; `.kimi/WORKFLOW_RULES.md` governs production/deploy workflow.
- GitHub is source of truth; production is Cloudflare Workers/OpenNext/Wrangler. Vercel is legacy and must not be assumed.
- Do not commit secrets. Do not disable RLS as a shortcut. Do not put service-role credentials in client code.
- Do not delete or alter `.kimi/`, `.agent/`, `CLAUDE.md`, or `.github/`; OMP disables their discovery instead.
- For live/paper trading, trades, sessions, Binance, tier, RLS, or trade history work: maintain full context, full evidence, and update `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` after verification.
- Cross-cutting, full-stack implementation work goes to `klarpakke-coder`; narrow specialist work goes to the relevant `klarpakke-*` agent.

## KIMI 2.7 Code / OMP 16.2.12 tuning

This project is tuned for KIMI 2.7 Code:

- `modelRoles` locks every role to `kimi-k2-7-code/kimi-for-coding` (high-thinking for reasoning roles, plain for `smol`).
- `defaultThinkingLevel: high` so architect/integrity reasoning is on by default.
- `tools.format: kimi` for native KIMI tool-use fidelity.
- `textVerbosity: medium` for concise engineering output.
- Project overlay: `task.maxConcurrency: 4`, `eager: always`, `autolearn: false` to keep M1 macOS responsive while still delegating work in parallel.
- Specialist agents have `thinkingLevel: high` except `klarpakke-cockpit-qa` (`medium`).
- `klarpakke-coder` is the full-stack generalist for work that spans multiple domains; it has full tool access and delegates to the narrow specialists when one domain dominates.
- Use subagents and swarms frequently for independent bounded work; Main synthesizes and verifies.
- KIMI 2.7 Code is configured via API key through the `kimi-k2-7-code` provider in `~/.omp/agent/models.yml`. Do not store API keys or tokens in the repo; keep them in user-local secret stores such as `.env.local` or system keychains.
