# Testnet API-nøkkelprovisjonering + end-to-end-verifisering (2026-08-01)

Første gang Klarpakke utførte ekte børs-ordrer (testnet): BUY 10 USDT BTC → SELL → saldo OK.
Rotårsaken til at live-trading aldri var testet: Toms konto hadde ingen nøkler (vault inneholdt kun dummy 21–24 tegn fra en testkonto).

## Full provisjoneringsflow (testnet.binance.vision)

1. Åpne i brukerens Chrome (beholdt profil → cookies/SSO-sesjon):
   `open -a "Google Chrome" "https://testnet.binance.vision/"`
2. Binance Spot Testnet autentiserer med **GitHub-OAuth** (IKKE Binance-konto).
   - Allerede autorisert → GitHub-siden «OAuth application authorized — You are being redirected to the authorized application» → auto-redirect tilbake.
   - Hvis ikke autorisert: «Authorize application»-skjerm med app-navn «binance-exchange»-lignende. (Tom sin sesjon var allerede autorisert.)
3. Land på testnet-siden: «Logged in as test user» + numerisk bruker-ID. «API Keys»-heading, «You currently have no API Key registered for this user.», link **«Generate HMAC-SHA-256 Key»**.
4. Genereringsform:
   - Description: unikt navn, 1–20 tegn (bokstaver/tall/dash/underscore). Brukte `klarpakke-testnet-1`.
   - Key permissions: **TRADE** (can place/cancel orders) + **USER_DATA** (view account/query trades) — de som kreves for handel. FIX_API / FIX_API_READ_ONLY er kun for Ed25519-nøkler (HMAC-SHA-256-tilfellet).
   - Generate-knapp.
5. Nøklene vises ÉN gang med advarsel «Save these values right now. They won't be shown ever again!». HMAC-nøkler = 64 tegn hver.

### cua-driver-pitfalls underveis (Chrome, macOS)
- `click` på AXLink «Generate HMAC-SHA-256 Key» feilet: `AXUIElementPerformAction(AXPress) returned -25202` → fallback til koordinat-klikk `[x,y]` fungerte.
- `type` (både background og foreground) leverte **0 av 19 tegn** i description-feltet → Tom limte nøklene inn manuelt i chat. Hvis typing feiler slik, ikke loop — be brukeren om å fullføre/lim inn.
- Fangeskala: `capture` uten riktig `window_id` ga tomme vinduer (0x0); Chrome hadde 4 vinduer, OAuth/testnet-fanen lå i et nyere vindu enn det eldste. Bruk `list_windows` → identifiser riktig `window_id` (tittel «Binance Spot Test Network»).

## Lagring: api_keys (produksjonskilde #2)

Skjema (api_keys-tabellen):
```sql
user_id uuid, exchange text, api_key_encrypted text, api_secret_encrypted text,
permissions ARRAY, is_testnet bool, is_active bool, last_used_at, created_at, updated_at
```

- `api_key_encrypted` = **klartekst-nøkkel** (ExecutorFactory leser den direkte som string).
- `api_secret_encrypted` = AES-256-GCM via `src/lib/crypto.encrypt()`:
  - key = `scryptSync(secret, 'salt', 32)`, iv = 16 bytes random
  - format: `ivHex:authTagHex:encryptedHex`
- ExecutorFactory kilde-prioritet: exchange_connections → **api_keys** → user_binance_keys → user_profiles. api_keys er den kundenes BinanceAPISettings-UI skriver til → den riktige produksjonsveien.
- `canTradeLive()`/`/api/pilot` sjekker alle kilder; en aktiv api_keys-rad = `hasKeys=true`.

## Skriptene (alle maskerer nøkler; ingen printer klartekst)

| Script | Rolle |
|---|---|
| `scripts/store-binance-keys.mjs` | Tar nøkler fra env (`BINANCE_TESTNET_API_KEY`/`_SECRET`), krypterer secret, sletter gamle testnet-rader for brukeren, insert i api_keys med `permissions ARRAY['TRADE','USER_DATA']`, `is_testnet=true`. |
| `scripts/verify-testnet-keys.mjs` | api_keys → dekryptering → HMAC-signering → `GET /api/v3/time` + `GET /api/v3/account`. Printer kun maskert key + status. |
| `scripts/testnet-order-test.mjs` | Market BUY 10 USDT BTC → Market SELL hele posisjonen → saldo-sjekk. Hard stopp hvis base-URL starter med mainnet. |
| `scripts/testnet-live-test.mjs` | Eldre: vault-veien (user_binance_keys → decrypt_binance_keys RPC). Dekker en annen kilde — kjør begge. |

## pg SSL-felle (alle Node-scripts mot Supabase)

`SELF_SIGNED_CERT_IN_CHAIN` — pg v8+ behandler `sslmode=require` som alias for `verify-full`.
```js
const client = new pg.Client({
  connectionString: connStr.replace('sslmode=require', 'sslmode=no-verify'),
  ssl: { rejectUnauthorized: false },
});
```
(psql klarer det samme uten endring; problemet er kun node-postgres.)

## Verifiseringsresultater (ekte kjøring)

```
⏱️  serverTime: HTTP 200 → serverTime=1785583384205
👤 account:    HTTP 200 — canTrade=true, balances (non-zero): 445
   这是测试币 free=10000, 456 free=10000, BNB free=1, BTC free=1, USDT free=10000, ETH free=1
🧪 TESTNET-ORDRE:
1️⃣ MARKET BUY 10 USDT BTC → HTTP 200, orderId=22645783, avg=63077.91, qty=0.00015000 BTC
2️⃣ MARKET SELL → HTTP 200, orderId=22645786, avg=63077.90
3️⃣ USDT free=9999.99053681 (startet 10000) → ~0.009 USDT i gebyr
```

Konklusjon: api_keys → dekryptering → HMAC-SHA-256 → testnet-ordre = komplett og verifisert. `canTradeLive` for Toms konto (0dd08529-b8a8-4fd3-9806-275e2d0135dd) = true.
