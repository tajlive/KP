# Klarpakke OMP Sticky Rules

- Use OMP-native project config only. Do not add or depend on Cursor, Antigravity, Claude, Gemini, Copilot, `.cursor/rules`, `.claude`, or `.agent` routing for new work.
- `.kimi/MASTER_PROMPT.md` is the project source of truth; `.kimi/WORKFLOW_RULES.md` governs production/deploy workflow.
- GitHub is source of truth; production is Cloudflare Workers/OpenNext/Wrangler. Vercel is legacy and must not be assumed.
- Do not commit secrets. Do not disable RLS as a shortcut. Do not put service-role credentials in client code.
- Do not delete or alter `.kimi/`, `.agent/`, `CLAUDE.md`, or `.github/`; OMP disables their discovery instead.
- For live/paper trading, trades, sessions, Binance, tier, RLS, or trade history work: maintain full context, full evidence, and update `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` after verification.
