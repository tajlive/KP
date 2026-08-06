---
name: klarpakke-api-failover
description: Use when Binance geo-blocks Cloudflare Workers (522 timeouts), proxy
  secrets fail, or market data stops flowing.
version: 1.0.0
author: Hermes Agent
license: MIT
disableModelInvocation: true
whenToUse: Når bruker ber om failover/fallback for Binance geo-block eller API-ruting.
  IKKE for vanlig API-debugging.
---

# Klarpakke API Failover & Workers Debugging

Bruk når API-endepunkter gir 522 timeout eller "Nettverksfeil" i UI.

## 1. Binance geo-block (Workers IP blokkert)

**Symptom:** Paper trading "Nettverksfeil" / 522 timeout. Health: `binanceConnectivity` error.

**Rotårsak:** Binance blokkerer Cloudflare Workers IP (403/451).
`BinanceMarketDataProvider` prøver proxy FØRST, men `BINANCE_PROXY_SECRET` mangler
i wrangler secrets → fallback til 7 direkte-endepunkter → 20s timeout.

**Diagnose:** `npx wrangler secret list | grep BINANCE_PROXY_SECRET`

**Fiks — to lag:**

Lag 1: Sett secret
```bash
cd /Users/taj/klarpakke && source .env.local
grep BINANCE_PROXY_SECRET .env.local | sed 's/.*=//' > /tmp/bps
npx wrangler secret put BINANCE_PROXY_SECRET < /tmp/bps
rm /tmp/bps
```

Lag 2: I execute-ruter, bruk proxy direkte:
```typescript
import { fetchPriceViaProxy } from "@/lib/trading/canonical/market-data/binance-proxy-provider";
fetchedPrice = await fetchPriceViaProxy(symbol);
```

## 2. Workers routing: /api/health/* → 522

**Symptom:** `/api/health` funker, `/api/health/*` timeout.

**Rotårsak:** OpenNext Workers ruter kun eksakte paths.

**Fiks:** Legg API-ruter på toppnivå: `/api/metrics` (ikke `/api/health/metrics`).

## 3. Wrangler auth: token mismatch

`source .env.local` før `npx wrangler *` — shell-token ≠ .env.local.

## 4. Wrangler auth: CLOUDFLARE_API_TOKEN overskriver OAuth

**Symptom:** `npx wrangler secret list` → `Authentication error [code: 10000]` / `Invalid access token [code: 9109]`, selv om deploy via `bash scripts/deploy.sh` fungerer.

**Rotårsak:** `CLOUDFLARE_API_TOKEN` (cfoat_…) i miljøet overskriver wrangler sin OAuth-login. Tokenet i config.yaml er IKKE gyldig for kontoen (80d5b1d…).

**Fiks:**
```bash
unset CLOUDFLARE_API_TOKEN; npx wrangler secret list --name klarpakke
```

## 5. Nye Worker-secrets (2026-08-01): kryptering av Binance-nøkler

`/api/binance/encrypt` og `exchange_connections`-kryptering krever disse secretene — de var ALDRI satt (bare kommenterte templates i .env.local) → brukernes Binance-kobling feilet i prod:

```bash
NEW_SECRET=$(openssl rand -hex 32)
unset CLOUDFLARE_API_TOKEN
echo "$NEW_SECRET" | npx wrangler secret put BINANCE_ENCRYPTION_SECRET --name klarpakke
echo "$NEW_SECRET" | npx wrangler secret put EXCHANGE_ENCRYPTION_SECRET --name klarpakke
# Synkroniser .env.local med SAMME verdi (ellers fungerer lokalt ≠ prod):
# bytt ut '=your-value-here' linjene i .env.local med verdien
```

To krypteringssystemer: `lib/crypto.encrypt()` (AES-GCM, `iv:authtag:data` format, BINANCE_ENCRYPTION_SECRET) for `api_keys.api_secret_encrypted`; `lib/exchanges/secret-crypto` (nonce + ciphertext-prefiks) med EXCHANGE_ENCRYPTION_SECRET for `exchange_connections.api_secret_ciphertext`. Hold begge satt med samme verdi.

## 6. BYO Binance: 4 parallelle nøkkellagringssystemer (viktig arkitektur)

Live-utførelse via `ExecutorFactory.create(supabase, userId, "live")` — kilde-prioritet (leses i rekkefølge):

1. `exchange_connections` (ny kanonisk, BYO-UI) — `api_key` + `api_secret_ciphertext/nonce`, dekrypter med `decryptExchangeSecret`, EXCHANGE_ENCRYPTION_SECRET
2. `api_keys` (kundenes BinanceAPISettings-UI) — `api_key_encrypted` (klartekst nøkkel!) + `api_secret_encrypted`, dekrypter med `decrypt()` fra `lib/crypto`, BINANCE_ENCRYPTION_SECRET
3. `user_binance_keys` (Vault-IDer) — `api_key_id`/`api_secret_id` → RPC `decrypt_binance_keys`
4. `user_profiles` legacy — `binance_api_key_id`/`binance_api_secret_id` + `binance_connected` flag

`canTradeLive()` og `/api/pilot` sin live-guard må sjekke ALLE kilder (`hasKeys = exchangeConn || ubkRow || apiKeyRow || binance_connected`). Kun kilde 3 hadde data i prod (testnet). Legg alltid til nye tabell-spørringer i testmockene (`makeSupabaseMock` i executor-factory.test.ts + trading.test.ts) — mock-kjeden må støtte `.eq().is().limit().maybeSingle()` og returnere `null` for ukjente tabeller, ellers får man `TypeError: supabase.from(...).select(...).eq is not a function` i canTradeLive-tester.

## 7. MCP Cloudflare fallback: ValidationError → wrangler CLI

**Symptom:** `mcp__cloudflare__secret_list`/`env_var_list` feiler med `ValidationError: CallToolResult content Field required` — MCP-serveren returnerer noe bridge-tool ikke kan parse (ofte nede).

**Fiks:** bruk wrangler CLI som fallback (unset CLOUDFLARE_API_TOKEN). Ikke retry MCP-kallet i loop — vent på auto-retry (~50s) eller gå til CLI.

## 8. BYO Binance nøkkelkilder — se references

Se `references/byo-binance-key-sources-2026-08-01.md` — full tabell over de 4 parallelle nøkkellagringssystemene (exchange_connections / api_keys / user_binance_keys / user_profiles), dekrypteringsmetoder, test-mock-fellen og Worker-secret-oppsett.

## 9. Vault-RPC-kræsj: `decrypt_binance_keys` JSON vs ren tekst (2026-08-01)

**Symptom:** `ERROR: 22P02: invalid input syntax for type json — Token "2XMLfCbI..." is invalid` ved `decrypt_binance_keys()`. Live-handel krasjer uansett nøkkelkilde.

**Rotårsak:** `store_binance_keys` lagrer API-NØKKELEN som REN TEKST i vault, men SECRET-en som JSON (`{"secret":..., "custom_data":{"is_testnet":...}}`). Den gamle RPC-en JSON-parset BEGGE (`s.secret->'custom_data'`) → krasj på nøkkelen.

**Fiks (robust RPC — se `supabase/migrations/20260801120000_fix_decrypt_binance_keys_json.sql`):**
- Dekrypter begge via `vault.decrypted_secrets` (tabell-alias `ds` — kvalifisert kolonne nødvendig, ellers `42702 ambiguous`)
- Secret: prøv JSON-parse; hvis `secret_json ? 'secret'` → hent `->>'secret'` + `is_testnet` fra custom_data; ellers (EXCEPTION) = gammelt ren-tekst-format → `is_test := true` (sikker default)
- ⚠️ Parameternavn `key_id`/`secret_id` MÅ beholdes (ExecutorFactory og scriptet kaller med dem). For å rename params internt: `DROP FUNCTION IF EXISTS decrypt_binance_keys(UUID,UUID)` FØRST, ellers `42P13 cannot change name of input parameter`. Bruk interne alias-variabler (`v_key_id := key_id`) for å unngå kolonne/param-kollisjon.
- Grant kun til `service_role` (revoke PUBLIC + authenticated).

Full feil-transcript + verifiserings-SQL: `references/vault-rpc-json-tekst-fix-2026-08-01.md`.

## 10. Testnet-live-verifisering: `scripts/testnet-live-test.mjs` (2026-08-01)

Verifiserer hele nøkkelkjeden end-to-end UTEN å lekke nøkler: `user_binance_keys` → `decrypt_binance_keys` RPC → HMAC-signering → `testnet.binance.vision` (server time → account → exchangeInfo → order/test → valgfri ekte testnet-ordre med `--place-order`).

```bash
cd /Users/taj/klarpakke && node scripts/testnet-live-test.mjs          # kun validering
node scripts/testnet-live-test.mjs <userId> --place-order              # ekte testnet-ordre (min 0.0001 BTC)
```

- **Innebygd mainnet-sikkerhetsstopp:** hvis `is_testnet=false` → avslutter UTDEN ordre. Aldri kjør mot mainnet-nøkler.
- Maskerer nøkler (kun `mask()`-visning), printer aldri klartekst.
- Leser `.env.local` via `dotenv.config({path: new URL("../.env.local", import.meta.url).pathname})` — `dotenv/config` alene laster IKKE `.env.local`.
- **Tolkning av svar:** `-2014 API-key format invalid` på `/api/v3/account` med korrekt signatur = kjeden fungerer (HMAC + kall-format OK), nøkkelen er ugyldig/dummy. Ekte Binance-nøkler er ~64 tegn; korte verdier (21-24 tegn) i vault = dummy/testdata fra testkontoer — sjekk `length(decrypted_secret)` FØR du konkluderer at live-trading er verifisert.

## 11. Testnet-nøkkelprovisjonering + api_keys-verifisering (2026-08-01)

Første ekte end-to-end-live-bevis: Toms testnet-nøkler (HMAC, 64 tegn) provisjonert, lagret i `api_keys`, BUY/SELL-syklus utført på testnet.binance.vision.

**Provisjoneringsflow (testnet.binance.vision):**
1. Åpne siden i brukerens Chrome (beholdt profil/cookies). `open -a "Google Chrome" "https://testnet.binance.vision/"`
2. Binance Spot Testnet bruker **GitHub-OAuth** (ikke Binance-konto). Allerede autorisert → "You are being redirected to the authorized application" → havner på testnet-siden som "Logged in as test user".
3. "Generate HMAC-SHA-256 Key" → Description (1–20 tegn, unikt) → **huk av TRADE + USER_DATA** (FIX_*-bokser kun for Ed25519) → Generate.
4. Nøklene vises ÉN gang — kopier umiddelbart. Testnet-nøkler er ~64 tegn (HMAC). Korte/dummy-verdier (21–24 tegn) = ikke ekte.

**Lagring (produksjonsvei, kilde #2 — den ExecutorFactory faktisk leser):** `api_keys`-rad: `api_key_encrypted` = KLARTEKST-nøkkel, `api_secret_encrypted` = AES-GCM via `lib/crypto` (BINANCE_ENCRYPTION_SECRET), `is_testnet=true`, `is_active=true`, `permissions ARRAY['TRADE','USER_DATA']`.

**Scripts (alle maskerer nøkler, ingen printer klartekst):**
```bash
# Lagre: henter nøkler fra env, krypterer secret, upsert api_keys
BINANCE_TESTNET_API_KEY=... BINANCE_TESTNET_API_SECRET=... node scripts/store-binance-keys.mjs
# Verifiser produksjonsveien (api_keys → dekryptering → HMAC → /time + /account)
node scripts/verify-testnet-keys.mjs
# Full handelssyklus: market BUY 10 USDT BTC → SELL tilbake → saldo-sjekk
node scripts/testnet-order-test.mjs
```
`verify-testnet-keys.mjs` og `testnet-order-test.mjs` dekker **api_keys-veien**; `testnet-live-test.mjs` (seksjon 10) dekker vault-veien (`user_binance_keys`). Kjør begge — de beviser hver sin kilde.

**⚠️ pg SSL-felle (Node-scripts mot Supabase):** pg v8+ behandler `sslmode=require` som alias for `verify-full` → `SELF_SIGNED_CERT_IN_CHAIN` selv med `ssl:{rejectUnauthorized:false}`. Fiks: `connStr.replace('sslmode=require','sslmode=no-verify')` + `ssl:{rejectUnauthorized:false}`. Dette gjelder ALLE lokale Node-scripts som kobler til Supabase-Postgres.

**cua-driver-notat (Chrome-AX):** klikk på AXLink kan feile med `-25202` → fallback til koordinat-klikk fungerer. `type` kan levere 0 tegn (leverer aldri hele strengen) → hvis det skjer, la brukeren lime inn nøklene manuelt og ta dem derfra. Vinduer må fanges med eksplisitt `window_id` (window 250 var gammelt, OAuth-fanen lå i et nyere vindu).

Full detalj + verifiseringsresultater: `references/testnet-api-keys-provisioning-2026-08-01.md`.

## 12. binance-proxy EF direkte-kall: responsformat `data` (IKKE `body`) + dobbel-auth (2026-08-01)

`scripts/testnet-proxy-order-test.mjs` beviser FULL produksjonsvei: `api_keys` → `binance-proxy` Supabase EF → `testnet.binance.vision` (BUY + SELL fylt, HTTP 200 hele veien).

**⚠️ KRITISK FELLE — proxyen returnerer `{ok, status, data, endpointUsed}`, IKKE `body`:** `data` er Binance-responsen (parsed JSON). Leser du `.body` får du `undefined` på `orderId`/`executedQty` → neste kall (SELL med `quantity: buyBody.executedQty`) feiler med *misvisende* Binance-feil: `400 Param 'quantity' or 'quoteOrderQty' must be sent, but both were empty/null!`. Prod-koden (`BinanceProxyExecutor.invokeProxy`, `binance-proxy-executor.ts:129`) leser korrekt `payload.data` — verifiser script/kall mot `data`, aldri `body`.

**Auth (begge krevd — denne EF-en er IKKE bare proxy-secret):**
```http
Authorization: Bearer <NEXT_PUBLIC_SUPABASE_ANON_KEY>   # gateway JWT — uten: 401 UNAUTHORIZED_NO_AUTH_HEADER
x-binance-proxy-secret: <BINANCE_PROXY_SECRET>          # funksjonsnivå-sperre
```

**Payload:** `{ action, apiKey, apiSecret, testnet: true, params }`. Actions: `testConnection`|`balance`|`account` (GET /api/v3/account), `order` (POST /api/v3/order), `openOrders`, `cancelOrder` (DELETE), `orderStatus`, `publicApi` (+`publicApiPath`). `testnet:true` → `BINANCE_TESTNET_BASES` (`testnet.binance.vision`).

**Market-ordrer:** BUY med `quoteOrderQty` ('10' = 10 USDT), SELL med `quantity` (= `executedQty` fra buy-svaret). Saldo bekrefter runden (testnet-gebyr ~0.009 USDT).

Kjør: `node scripts/testnet-proxy-order-test.mjs` — dekker proxy-veien; de tre scriptene i seksjon 11 dekker direkte-HMAC-veien. Bevis hver for seg.

## 13. Live-ordrer avvist av Binance: 400-feil fra PROXY-veien (2026-08-01)

Når live-sesjonen går gjennom proxyen og Binance svarer med 400, skill de to
klassene — de er IKKE proxy-feil, men dataproblemer:

- **`400 Invalid symbol`** → symbolet er delistet på Binance. **MATICUSDT
  finnes IKKE** (MATIC→POL-migrering 2024, verken mainnet eller testnet).
  Verifiser alltid: `https://testnet.binance.vision/api/v3/exchangeInfo`
- **`400 Filter failure: LOT_SIZE`** → kvantum ikke multiplum av symbolets
  stepSize; `STATIC_LOT_SIZES` (lot-sizes.ts) manglet symbolet → BTC-fallback
- **`400 Param 'quantity' or 'quoteOrderQty' must be sent, but both were
  empty/null!`** → du leste proxy-responsens `body` i stedet for `data`
  (seksjon 12) → `executedQty` ble undefined

Komplett 5-trinns feil-stige for «live-sesjon trader aldri» (hold → risk-blocked
→ invalid symbol → LOT_SIZE → auto-stopped) + SQL-fikser:
`klarpakke-tick-wiring` → `references/live-first-order-ladder-2026-08-01.md`.

**Viktig:** `trading_logs` er den pålitelige kilden (har `details.reason` +
`requested_amount`); tick-responsen viser kun siste action. Live-sesjoner
settes til `status='stopped'` på permanente Binance-feil — reaktiver manuelt
etter fiks.



