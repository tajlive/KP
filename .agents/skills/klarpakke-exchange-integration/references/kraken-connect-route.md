# Kraken Connect Route — oppskrift, bug og test (2026-08-06)

Gjelder `src/app/api/kraken/connect/route.ts` (Task A1, commit a82826230).

## Flyt i ruta

1. Valider `userId`/`apiKey`/`apiSecret` — mangler → 400 «Missing required fields».
2. Verifiser nøkler med `new KrakenClient(apiKey, apiSecret).getBalance()` — kast/feil → **400** «Invalid API keys» (tidligere 401 — endret 2026-08-06).
3. Krypter begge med `encryptApiKey()` fra `src/lib/crypto/encrypt-api-keys.ts` (AES-256-GCM, Web Crypto; `ENCRYPTION_KEY` = 32-byte hex fra `.env.local`; output = base64(iv + ciphertext)).
4. Lagre: `.upsert(row, { onConflict: "user_id" })` mot `user_kraken_keys`.

## Buggen (viktig)

- `user_kraken_keys.user_id` **HAR en UNIQUE-begrensning** (bekreftet via Supabase MCP `list_tables`: `"options":["updatable","unique"]` + FK → `auth.users.id`).
- Gammel kode kalte `.upsert(row)` uten onConflict → andre tilkobling for samme bruker kolliderte med UNIQUE(user_id) → ruta svarte 500. Feilen ble feildiagnostisert som «Invalid API keys» (brukeren trodde nøkkelen var feil; et rå signert `Balance`-kall beviste at nøkkelen var gyldig).
- **Generell regel:** enhver upsert mot en tabell med UNIQUE-kolonne (user_id, user_id+exchange, …) må ha `{ onConflict: "<kolonner>" }`. Grep-repoet har flere korrekte eksempler (`src/app/api/exchanges/connections/route.ts` bruker `{ onConflict: "user_id,exchange" }`).
- Merk: å sende `created_at` i upsert-payloaden overskriver created_at ved conflict-update. Renere: la DB-default (`now()`) sette created_at på insert og ikke inkludere den i raden.

## Rutetest — `src/app/api/kraken/connect/__tests__/route.test.ts`

Vitest-oppskrift for Next.js API-ruter i Klarpakke:

1. **Last `.env.local` FØR rute-importen** (vitest laster den IKKE automatisk):
   ```ts
   import { config as loadEnv } from "dotenv";
   loadEnv({ path: ".env.local" });
   ```
   Nødvendig fordi ruta bruker `process.env.ENCRYPTION_KEY` og evt. Supabase-URL-er ved modul-lastetid.
2. **Mock `@supabase/supabase-js`** med `vi.hoisted` + `vi.mock`:
   ```ts
   const upsertMock = vi.hoisted(() => vi.fn());
   vi.mock("@supabase/supabase-js", () => ({
     createClient: () => ({ from: () => ({ upsert: upsertMock }) }),
   }));
   ```
3. **Mock klasser som instansieres med `new` ved å returnere en EKTE klasse** fra fabrikken — arrow-`vi.fn(() => ({...}))` feiler med «…is not a constructor»:
   ```ts
   vi.mock("@/lib/exchanges/kraken/client", () => {
     class MockKrakenClient {
       getBalance = getBalanceMock;
     }
     return { KrakenClient: MockKrakenClient };
   });
   ```
4. Bygg request med `new NextRequest("http://localhost/api/kraken/connect", { method: "POST", body: JSON.stringify({...}) })`.
5. Assertér buggen direkte: `expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id }), expect.objectContaining({ onConflict: "user_id" }))` — dette var den røde testen som beviste fiksen.
6. Verifiser at nøklene ligger kryptert: `row.api_key_encrypted` er base64 (`/^[A-Za-z0-9+/]+={0,2}$/`) og ≠ klartekst.

## Verifisering

- `npx vitest run src/app/api/kraken/connect/__tests__/route.test.ts` → 4/4
- `npx tsc --noEmit` → 0
- `npx eslint <endrede filer> --max-warnings 0` → 0
