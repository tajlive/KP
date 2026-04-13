# API Contracts

## Paper Trading
### POST /api/auto-trading/paper
**Request:**
```json
{
  "strategy": "dca|trend|grid|multi|ai-copy",
  "risk_level": "low|medium|high",
  "pairs": ["BTCUSDT"],
  "starting_capital_nok": 100000
}
```
**Response (success):**
```json
{
  "ok": true,
  "code": "PAPER_BOT_STARTED",
  "session_id": "uuid",
  "next_step": "open_bot_details"
}
```
**Error codes:** `UNAUTHORIZED`, `VALIDATION_FAILED`, `PAPER_BOT_SESSION_LIMIT`, `INTERNAL_ERROR`

### POST /api/paper-trading/init
- Bruker `createServerClient()` (async, no args)
- Kaller `getOrCreatePaperTradingSession()`

### GET /api/signal/current
- Returnerer ConfluentSignal for gitt symbol
- Brukes av `TopAIInsightsRow`

## Auth Pattern (alle API routes)
```typescript
// Route Handler pattern (synkron):
const response = NextResponse.next();
const supabase = createServerClient(request, response);

// Server Component pattern (asynkron):
const supabase = await createServerClient();
```

## Supabase Client Valg
| Kontekst | Funksjon | Auth |
|----------|----------|------|
| API Route (user context) | `createServerClient(req, res)` | Anon key + cookies |
| Server Component | `await createServerClient()` | Anon key + cookies |
| Service role (admin) | `createClient()` | Service role key |
