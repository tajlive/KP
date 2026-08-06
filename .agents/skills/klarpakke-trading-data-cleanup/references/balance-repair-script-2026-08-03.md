# Balance-reparasjon via script — 2026-08-03

TDD-bygget reparasjonsscript for `paper_accounts.current_balance` etter valuta-buggen (orphan-adopsjon + highest_price-tracking, 2026-08-02→03). Plan: Task 1 i nettside-fakta-verifisering.

## Filer

- `scripts/repair-paper-account-balances.ts` — eksporterer `calculateCorrectBalance(sessions, coinPrices)`, `shouldRepair(current, correct, threshold=100)`, `normalizeSymbol(pair)`, `repairAllBalances({dryRun, userEmail, threshold})` + CLI.
- `scripts/__tests__/repair-paper-account-balances.test.ts` — 8 tester (kanonisk plan-test, `/`-normalisering, entry_price-fallback, string-NUMERIC, null-posisjon, terskel, symmetri).

## CLI

```bash
npx tsx scripts/repair-paper-account-balances.ts                       # full kjøring
npx tsx scripts/repair-paper-account-balances.ts --dry-run              # ingen endringer
npx tsx scripts/repair-paper-account-balances.ts --dry-run --user=<epost>
```

- CLI-kjøring beskyttes med `import.meta.url === pathToFileURL(process.argv[1]).href` (ESM — `require.main` finnes ikke).
- `dotenv` lastes kun i CLI-grenen slik at testimport aldri rører env/DB.
- Supabase-klienten opprettes inne i `repairAllBalances` (ikke på modulnivå).

## E-post→id-oppslag

- `supabase.auth.admin.listUsers()` feiler: GoTrue svarer HTTP 500 (se klarpakke-supabase-ops-pitfall; per_page-kap).
- Løsning i scriptet: raw `fetch` til `${url}/auth/v1/admin/users?per_page=25` (page 1) — `per_page` MÅ være ≤ 25 på dette prosjektet.
- `user_profiles.email` er ikke pålitelig (~5/40 rader populet).

## Mål-data (testbruker `test+tricky+123@klarpakke.no`)

- `user_id`: `782eb85b-4c6b-47e8-9d7f-ee6c471a3e1e`
- `paper_accounts.current_balance` var 64 221.00 NOK; 10 aktive paper-sesjoner hver med cash ~1,2–8,7k + åpen posisjon; 2 stoppet BTCUSDT-sesjoner (~90–94k cash) som IKKE skal telles.
- Beregnet korrekt balance ≈ 105,7k NOK (cash + posisjonsverdi til gjeldende coin_prices) → avvik ~41k ≫ 100 NOK → repareres.

## Test-kommando (mandert av planen)

```bash
npx vitest run scripts/__tests__/repair-paper-account-balances.test.ts
```

Krevde config-fiks: se klarpakke-dev «Vitest: scripts-tester utenfor src/».
