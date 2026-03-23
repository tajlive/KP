# Fasit: remote DB-reparasjon (paper trading / trades) — mars 2026

Bruk når **`supabase db push --linked` feiler** pga. migrasjonshistorikk-drift, men du må likevel få prod/dev-remote i tråd med appen.

## Kommando (kilde sannhet i repo)

```bash
# Krever: .env.local med SUPABASE_ACCESS_TOKEN + supabase link til riktig ref
npm run db:apply:trading-core
```

Dette kjører **to** idempotente SQL-filer via `supabase db query --linked`:

1. `supabase/migrations/20260325080000_ensure_public_trades_and_risk_daily_loss.sql` — `public.trades`, indekser, RLS, `calculate_daily_loss` med `search_path = public`.
2. `supabase/migrations/20260325120000_ensure_trading_sessions_triggers_search_path.sql` — `public.trading_sessions` (tabell + manglende kolonner), `notification_queue`, triggere på `public.trades` med **`SET search_path = public`** og **`public.*`** (unngår `42P01` «relation … does not exist» under `SECURITY DEFINER`).

Skript: `scripts/supabase-query-linked.mjs` (støtter flere `.sql` i én kjøring).

## Symptomer som skal forsvinne

- `relation "trades" does not exist` → RPC / risk → `DAILY_LOSS_CHECK_FAILED`.
- `relation "trading_sessions" does not exist` ved `INSERT` på `trades` (typisk etter at `trades` finnes men triggere mangler `search_path`).

## Verifikasjon (etter kjøring)

```bash
npm run lint && npm run type-check && npm run test:unit
KLARPAKKE_E2E_FROM_PROVISION=1 npx playwright test e2e/critical/paper-trading.spec.ts --project=critical-chromium
```

Forvent at **«paper execute returns session_id and trade row visible on session page»** er **grønn** (øvrige tester i filen kan fortsatt være skipped pga. UI-selektorer).

## Langsiktig: få `db push` til å virke igjen (historikk-drift)

**Det er ikke umulig å automatisere Supabase** — men det er to lag:

| Lag                             | Hva                                                              | Kommando                                                   |
| ------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Skjema (innhold)                | Idempotent SQL utenom migrasjonstabellen                         | `npm run db:apply:trading-core`                            |
| Historikk (`schema_migrations`) | Remote har «spøkelsesversjoner» som ikke finnes som filer lokalt | `npm run db:repair:drift` deretter `npm run db:push:drift` |

**Typisk feil:** `Remote migration versions not found in local migrations directory` + hint om `migration repair --status reverted …`.

- **Feil syntaks:** `supabase migration repair / db pull` (én kommando) — CLI forstår ikke `/` som «og».
- **Riktig:** `npx supabase migration repair --status reverted 20260313 20260318042314 20260322020127 --linked` (versjoner fra _din_ feilmelding kan avvike — kopier fra CLI-utskriften).

Etter repair:

```bash
npm run db:push:drift
# eller: npx supabase db push --linked --include-all
```

CLI kan spørre `[Y/n]` når lokale filer skal innføres «før» siste remote — svar **Y**. I script/CI: `yes | npx supabase db push --linked --include-all` (bruk med omtanke).

Deretter: `npx supabase migration list --linked` skal vise færre avvik.

**Git (vanlig feil):** `git add + commit` tolker `+` som filnavn. Bruk:

```bash
git add -A
git status
git commit -m "beskrivelse"
```

**Etter historikk er i orden:** bruk `npm run db:push` i vanlig flyt; ved nye «insert before last»-meldinger, bruk `npm run db:push:drift`.

**Duplikat-migrasjoner:** To filer som begge definerer samme skjema med ulike versjons-prefiks (f.eks. `20260313_*.sql` og `20260313000001_*.sql`) gir rot i `migration list` og kan gjøre at `db push` feiler etter repair. Behold én tidsstemplet fil; slett/arkiver den andre, kjør ev. `migration repair --status reverted 20260313 --linked` om spøkelsesversjon `20260313` henger igjen på remote.

**MCP Supabase i Cursor:** `SUPABASE_ACCESS_TOKEN` må være tilgjengelig for MCP-prosessen (se `docs/MCP-CLI-CI-API.md`); ellers `npm run db:apply:trading-core` fra terminal.

## Linear

**KLA-239** er **Done** (kort beskrivelse + peker hit / `d06467bd1`). Gamle kommentarer på saken er fjernet.

SoT: `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md`.
