# KLARPAKKE PHASE 2: LIVE TRADING + AI COPILOT

## CRITICAL: Read This First

This prompt is for continuing development of Klarpakke, a Norwegian crypto education + trading platform. Give this entire document to Claude Code or Claude Projects.

---

## CURRENT STATE (Phase 1 Complete)

### Verified Facts (2026-02-10)
- **Framework:** Next.js **14.1.0** (NOT 15) with App Router
- **Build mode:** `output: 'export'` — static site, NO server-side rendering
- **API routes in `src/app/api/`:** Exist but are NOT deployed (static export ignores them)
- **Server-side logic:** Cloudflare Workers in `functions/` directory (these DO work in production)
- **Supabase client (browser):** `import { createClient } from '@/lib/supabase/client'` — singleton pattern
- **Supabase client (server):** `import { createClient } from '@/lib/supabase/server'` — `@supabase/ssr` with cookies
- **i18n:** `next-intl` — locales `no` (default), `en` — prefix `always` — routes under `src/app/[locale]/`
- **i18n messages:** `messages/no.json` and `messages/en.json`
- **TypeScript:** `strict: false`, `noImplicitAny: false`
- **Path alias:** `@/*` maps to `./src/*`
- **Build:** 65 static pages, 0 type errors, 0 fetch('/api/...') calls
- **CI/CD:** Disabled — deploy manually via `npx wrangler pages deploy out/`

### Architecture (Two Runtime Layers)

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: Static Frontend (Next.js static export)       │
│  - All pages pre-rendered to HTML/JS in out/            │
│  - Client components use Supabase JS client directly    │
│  - NO server-side rendering, NO API routes              │
│  - Deployed to Cloudflare Pages as static files         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: Cloudflare Workers (functions/ directory)     │
│  - Server-side logic that DOES work in production       │
│  - Located in functions/api/*.js                        │
│  - Routed via functions/_routes.json                    │
│  - Has access to env vars (secrets, service role key)   │
│  - Can make authenticated API calls (Binance, etc.)     │
│  - ALREADY has: binance/connect, auto-trade/execute     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: Supabase (Database + Auth)                    │
│  - PostgreSQL with RLS on all tables                    │
│  - Auth: Google OAuth, Microsoft OAuth, Email/Password  │
│  - Tables: profiles, beta_signups, portfolios, trades   │
│  - Already has: trading_api_keys, auto_trade_settings   │
└─────────────────────────────────────────────────────────┘
```

### Existing Exchange Infrastructure
These Cloudflare Worker functions ALREADY EXIST in `functions/`:

| File | Status | What It Does |
|------|--------|-------------|
| `functions/api/binance/connect.js` | Working (no encryption) | Connects Binance API, validates keys, stores in `trading_api_keys` |
| `functions/api/binance/test.js` | Exists | Tests Binance API connectivity |
| `functions/api/auto-trade/execute.js` | Working (simulated) | Executes trades with risk checks, daily limits, position sizing |
| `functions/api/auto-trade/settings.js` | Exists | Manages auto-trade user settings |
| `functions/api/exchange/connect.js` | Mock only | Generic exchange connect (returns mock data) |

### Existing Database Tables (already in Supabase)
- `trading_api_keys` — user exchange API keys (currently stored unencrypted!)
- `auto_trade_settings` — per-user auto-trade configuration
- `auto_trades` — trade execution log
- `auto_trade_daily_stats` — daily P&L tracking

### Key Security Issue
**API keys in `trading_api_keys` are stored as plaintext.** The `binance/connect.js` worker has TODO comments about encryption. This MUST be fixed before any real trading.

---

## PHASE 2 TASKS (Prioritized)

### P0: Fix API Key Encryption (SECURITY CRITICAL)

**File:** `functions/api/binance/connect.js`

The current code stores API keys in plaintext:
```javascript
// Current (INSECURE):
api_key_encrypted: apiKey,      // TODO: Krypter dette!
api_secret_encrypted: apiSecret, // TODO: Krypter dette!
```

**Fix:** Use Web Crypto API (available in Cloudflare Workers) to encrypt with AES-256-GCM before storing. The encryption key should come from a Cloudflare environment variable (`ENCRYPTION_SECRET`).

**Requirements:**
- Encrypt API key + secret with AES-256-GCM before Supabase insert
- Store IV alongside encrypted data
- Decrypt only in Worker memory when executing trades
- Never log or return decrypted keys

### P1: AI Trading Copilot (Cloudflare Worker)

**CRITICAL ARCHITECTURE NOTE:** The AI copilot CANNOT run client-side because:
1. `ANTHROPIC_API_KEY` would be exposed in the browser
2. Static export means no server components

**Solution:** Create a new Cloudflare Worker function:

**File:** `functions/api/ai/analyze-trade.js`

This worker should:
1. Receive trade request + user context
2. Call Claude API (server-side, key stays secret)
3. Return risk analysis in user's language (no/en)
4. Store analysis in Supabase for learning

**Required env vars (set in Cloudflare Pages dashboard):**
```
ANTHROPIC_API_KEY=sk-ant-xxx
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Claude API call pattern for Cloudflare Workers:**
```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })
});
```

Note: Use `claude-sonnet-4-5-20250929` for cost efficiency on trade analysis. Reserve Opus for complex strategy analysis.

### P2: Pre-Trade Warning UI Component

**File:** `src/components/trading/PreTradeWarning.tsx`

Client component that:
1. Calls `functions/api/ai/analyze-trade.js` via fetch
2. Shows risk level with color coding (green/yellow/orange/red)
3. Displays AI reasoning in user's locale
4. Requires checkbox confirmation for high-risk trades
5. Blocks extreme-risk trades entirely

**i18n:** Add `trading` namespace to both `messages/no.json` and `messages/en.json`

### P3: Exchange Connect UI

**File:** `src/app/[locale]/trading/connect/page.tsx`

Localized page under `[locale]` for connecting exchange accounts. Must:
1. Use `useTranslations('trading')` for all text
2. Call existing `functions/api/binance/connect.js` worker
3. Show security warnings about API key permissions
4. Validate that WITHDRAW is not enabled

### P4: New Database Tables

```sql
-- AI risk analyses
CREATE TABLE ai_risk_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trade_request JSONB NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'extreme')),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('approve', 'caution', 'block')),
  reasoning TEXT NOT NULL,
  locale TEXT DEFAULT 'no',
  alternatives JSONB,
  educational_tips TEXT[],
  user_proceeded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk limits per user
CREATE TABLE user_risk_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  max_position_size_pct DECIMAL(5,2) DEFAULT 10.0,
  max_daily_loss_nok DECIMAL(15,2) DEFAULT 1000.0,
  forced_stop_loss_pct DECIMAL(5,2) DEFAULT 5.0,
  daily_loss_today_nok DECIMAL(15,2) DEFAULT 0,
  cooling_off_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ai_risk_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_risk_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own analyses" ON ai_risk_analyses
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own limits" ON user_risk_limits
  FOR ALL USING (auth.uid() = user_id);
```

### P5: i18n Translations

Add to `messages/no.json`:
```json
{
  "trading": {
    "analyzingTrade": "AI analyserer trade...",
    "riskAnalysis": "AI Risikoanalyse",
    "riskLevel": "Risiko",
    "risk": { "low": "Lav", "medium": "Medium", "high": "Høy", "extreme": "Ekstrem" },
    "buy": "Kjøp",
    "sell": "Selg",
    "amount": "Beløp",
    "aiAssessment": "AI Vurdering",
    "learningPoints": "Læringspunkter",
    "understandRisk": "Jeg forstår risikoen og handler på eget ansvar",
    "cancel": "Avbryt",
    "tradeBlocked": "Trade Blokkert",
    "proceedAnyway": "Fortsett likevel",
    "executeTrade": "Utfør Trade",
    "connectExchange": "Koble til Exchange",
    "apiKeyLabel": "API Key",
    "apiSecretLabel": "API Secret",
    "permissionsWarning": "Kun READ og TRADE tillatelser. ALDRI aktiver WITHDRAW!",
    "securityNote": "Dine API-nøkler er kryptert med AES-256. Vi har aldri tilgang til dine penger."
  }
}
```

Add to `messages/en.json`:
```json
{
  "trading": {
    "analyzingTrade": "AI analyzing trade...",
    "riskAnalysis": "AI Risk Analysis",
    "riskLevel": "Risk",
    "risk": { "low": "Low", "medium": "Medium", "high": "High", "extreme": "Extreme" },
    "buy": "Buy",
    "sell": "Sell",
    "amount": "Amount",
    "aiAssessment": "AI Assessment",
    "learningPoints": "Learning Points",
    "understandRisk": "I understand the risks and trade at my own responsibility",
    "cancel": "Cancel",
    "tradeBlocked": "Trade Blocked",
    "proceedAnyway": "Proceed anyway",
    "executeTrade": "Execute Trade",
    "connectExchange": "Connect Exchange",
    "apiKeyLabel": "API Key",
    "apiSecretLabel": "API Secret",
    "permissionsWarning": "Only READ and TRADE permissions. NEVER enable WITHDRAW!",
    "securityNote": "Your API keys are encrypted with AES-256. We never have access to your funds."
  }
}
```

---

## RULES FOR IMPLEMENTATION

1. **Static export constraint:** All new UI must be client components (`'use client'`). Server-side logic goes in `functions/api/*.js` (Cloudflare Workers).

2. **No `fetch('/api/...')` to Next.js API routes.** These don't work in production. For server-side operations, either:
   - Use direct Supabase queries from the browser client (for simple CRUD)
   - Use Cloudflare Worker functions in `functions/` (for secrets, external APIs)

3. **Supabase client import:** Always use `import { createClient } from '@/lib/supabase/client'` — NOT `createClientComponentClient` from auth-helpers (this package is not installed).

4. **i18n for all new pages:** New pages go under `src/app/[locale]/` and use `useTranslations()`. Add translations to both `messages/no.json` and `messages/en.json`.

5. **Cloudflare Worker functions:** Written in plain JavaScript (not TypeScript). Access env vars via `context.env`. Auth via Bearer token in Authorization header, verified with `supabase.auth.getUser(token)`.

6. **Never expose secrets client-side:** `ANTHROPIC_API_KEY`, `ENCRYPTION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` must only be used in Cloudflare Workers, never in browser code.

7. **After every change:** Run `npm run type-check && npm run build` to verify 0 errors and 65+ static pages.

---

## VERIFICATION CHECKLIST

After implementing each task:

- [ ] `npm run type-check` passes (0 errors)
- [ ] `npm run build` succeeds (65+ pages)
- [ ] No `fetch('/api/...')` calls to Next.js API routes in `src/`
- [ ] All new UI text uses `useTranslations()` with both no/en translations
- [ ] No secrets in client-side code
- [ ] API keys encrypted before database storage
- [ ] Cloudflare Worker functions follow existing auth pattern (Bearer token)
- [ ] New Supabase tables have RLS policies
