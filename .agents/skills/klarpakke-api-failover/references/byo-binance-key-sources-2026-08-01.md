# BYO Binance nøkkelkilder — 4 parallelle systemer (2026-08-01)

Live-trading-utførelse krever Binance API-nøkler. Gjennom prosjektets historie har
nøklene blitt lagret i **fire ulike systemer** som ikke synkroniseres. `ExecutorFactory.create()`
må lese alle fire i prioritert rekkefølge.

## Kilde-prioritet i ExecutorFactory (live mode)

| # | Tabell | Kolonner | Dekryptering | Hvem skriver hit |
|---|--------|----------|--------------|------------------|
| 1 | `exchange_connections` | `api_key` (klartekst), `api_secret_ciphertext` + `api_secret_nonce` | `decryptExchangeSecret()` fra `@/lib/exchanges/secret-crypto` (AES-256-GCM, EXCHANGE_ENCRYPTION_SECRET, auth-tag prefixet i ciphertext) | BYO-UI `/api/exchanges/connections` |
| 2 | `api_keys` | `api_key_encrypted` (FAKTISK KLARTEKST!), `api_secret_encrypted` | `decrypt()` fra `@/lib/crypto` (AES-GCM, format `iv:authtag:data`, BINANCE_ENCRYPTION_SECRET) | Kundenes `BinanceAPISettings`-UI (`/dashboard/settings`) |
| 3 | `user_binance_keys` | `api_key_id`, `api_secret_id` (Vault-IDer) | RPC `decrypt_binance_keys(key_id, secret_id)` (service_role only) | Eldre koblingsflyt; ENESTE kilde med prod-data (testnet) |
| 4 | `user_profiles` | `binance_api_key_id`/`binance_api_secret_id` + `binance_connected` flag | RPC `decrypt_binance_keys` | Legacy, ingenting skriver dit lenger |

## Viktige detaljer

- **`api_keys.api_key_encrypted` inneholder nøkkelen i klartekst** — kolonnenavnet lyver.
  Bare secret er kryptert. Ikke "forbedre" dette i en fiks uten migrasjonsplan.
- **testnet-flagget** kommer fra hver kilde (is_testnet-kolonne) eller fra RPC-svaret.
- `canTradeLive()` og `/api/pilot` sin live-guard må sjekke ALLE kilder:
  `hasKeys = exchangeConn || ubkRow || apiKeyRow || profile.binance_connected`.
- Kun kilde 3 (`user_binance_keys`) hadde data i prod (2026-08-01, testnet).
  `exchange_connections` og `api_keys` var tomme.

## Test-mock-fellen

Når ExecutorFactory leser nye tabeller, knekker testene med
`TypeError: supabase.from(...).select(...).eq is not a function` i `canTradeLive`-tester
fordi mock-kjeden mangler støtte for de nye spørringene.

Fiks i `makeSupabaseMock` (executor-factory.test.ts) og `createMockSupabase` (trading.test.ts):
- Legg til `maybeSingle()` i tillegg til `single()`
- Støtt kjeden `.eq().is().limit().maybeSingle()` — bygg en rekursiv `withEq`-mock:
```typescript
const emptyRow = async () => ({ data: null, error: null });
const limiter = { maybeSingle: emptyRow };
const withIs = { ...limiter, limit: vi.fn(() => limiter) };
const withEq = {
  eq: vi.fn(() => withEq),
  is: vi.fn(() => withIs),
  limit: vi.fn(() => limiter),
  maybeSingle: emptyRow,
};
return withEq; // ikke { select: () => withEq } — da er .eq undefined etter select
```

## Worker-secrets som kreves

- `BINANCE_ENCRYPTION_SECRET` — for `/api/binance/encrypt` (kundenes koblings-UI) + `api_keys`-dekryptering
- `EXCHANGE_ENCRYPTION_SECRET` — for `exchange_connections`-kryptering
- Begge var ALDRI satt (kun kommenterte templates i .env.local) → `/api/binance/encrypt`
  feilet i prod med "BINANCE_ENCRYPTION_SECRET ikke konfigurert".

Sett med samme verdi:
```bash
NEW_SECRET=$(openssl rand -hex 32)
unset CLOUDFLARE_API_TOKEN   # cfoat_-token overskriver OAuth → auth error
echo "$NEW_SECRET" | npx wrangler secret put BINANCE_ENCRYPTION_SECRET --name klarpakke
echo "$NEW_SECRET" | npx wrangler secret put EXCHANGE_ENCRYPTION_SECRET --name klarpakke
```
Oppdater .env.local med samme verdi (ellers fungerer lokalt ≠ prod).

## MCP Cloudflare fallback

`mcp__cloudflare__secret_list`/`env_var_list` kan feile med
`ValidationError: CallToolResult content Field required` — MCP-serveren returnerer noe
bridge-tool ikke kan parse. Bruk wrangler CLI som fallback:
```bash
unset CLOUDFLARE_API_TOKEN; npx wrangler secret list --name klarpakke
```
Ikke retry MCP-kallet i loop — vent på auto-retry (~50s) eller gå til CLI.
