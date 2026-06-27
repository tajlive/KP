# Chrome Control — Lead Architect Dashboard Automation

Local browser automation for operations that lack API access or where the current API token is under-scoped (e.g. creating Cloudflare tokens, Sanity read tokens, checking billing/quota).

## How it works

A dedicated MCP server (`scripts/chrome-mcp-server.mjs`) launches a real Chrome window via Playwright and exposes tools that KIMI can call. The browser uses a persistent profile under `.chrome-profile/` so logins survive restarts.

## Security model

- **Local only**: stdio MCP transport; no open network port.
- **Approval gate**: read tools (`navigate`, `screenshot`, `extract`, `evaluate`) run automatically; write tools (`click`, `fill`, `select`) pause until the user approves with `chrome_approve({approve:true})`.
- **Domain gate**: only HTTPS URLs on the allowlist or session-approved domains can be opened. Default allowlist: `klarpakke.no`, `www.klarpakke.no`. Extend via `CHROME_MCP_ALLOWLIST=example.com,another.com`.
- **Audit log**: every tool call is written to `logs/chrome-mcp.log`.
- **No password autofill**: KIMI must never fill password fields. The user logs in manually once; persistent profile keeps the session.

## Setup

1. Ensure Playwright browsers are installed:

   ```bash
   npx playwright install chromium
   ```

2. `MCP_API_KEY` must be set in `.env.local` (used by the wrapper).

3. Add the `chrome` MCP server to your MCP client config (already in `.mcp/mcp_config.json`):

   ```json
   {
     "mcpServers": {
       "chrome": {
         "command": "node",
         "args": ["/Users/taj/klarpakke/scripts/run-chrome-mcp.mjs"]
       }
     }
   }
   ```

## Available tools

| Tool | Class | Description |
|------|-------|-------------|
| `chrome_start` | auto | Launch Chrome (headed by default). |
| `chrome_stop` | auto | Close Chrome. |
| `chrome_navigate` | auto | Go to HTTPS URL; pauses if domain not allowlisted. |
| `chrome_screenshot` | auto | Capture base64 PNG of viewport. |
| `chrome_extract` | auto | Extract text/attribute or page title + visible text. |
| `chrome_evaluate` | auto | Run JS in page and return serializable result. |
| `chrome_click` | confirm | Click element; requires approval. |
| `chrome_fill` | confirm | Fill input; requires approval. |
| `chrome_select` | confirm | Select dropdown option; requires approval. |
| `chrome_approve` | auto | Approve/reject pending action or navigation. |

## Example: create a Cloudflare API token

```text
chrome_start
chrome_navigate https://dash.cloudflare.com/profile/api-tokens
chrome_screenshot
chrome_click selector="a[href='/profile/api-tokens/create']"
chrome_approve approve=true
# ... continue with fill/select/click, approving each write step ...
chrome_extract selector="[data-testid='token-value']"
# Paste the token into .env.local and run scripts/rotate-cloudflare-token.mjs
chrome_stop
```

## Manual start

```bash
node scripts/run-chrome-mcp.mjs
```

The server runs until killed. Keep the terminal visible so you can approve actions.

## Troubleshooting

- **Chrome does not open**: check that Playwright Chromium is installed (`npx playwright install chromium`).
- **Domain blocked**: approve it once with `chrome_approve({approve:true})` or add it to `CHROME_MCP_ALLOWLIST`.
- **Pending action stuck**: call `chrome_approve({approve:false})` to cancel, then retry.
