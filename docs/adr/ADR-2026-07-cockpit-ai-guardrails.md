# ADR 2026-07: Cockpit AI-guardrails og markedsplass-krok

## Status

Draft / accepted 2026-07-06.

## Kontekst

Trading Cockpit (`/handel`) og tilhørende AI-flater (`src/app/api/ai/explain-trade/route.ts`, `src/lib/ai/auto-trading-engine.ts`) bruker AI til å forklare handler og generere signaler. For å opprettholde tillit, sikkerhet og regulatorisk forsvarlighet må AI-en være tydelig underordnet brukerens risikoprofil, tier-rettigheter og menneskelig kontroll.

## Beslutning

1. **Kun forklarende og trygg veiledning**
   - AI-en skal aldri gi direkte kjøps- eller salgsråd (f.eks. «kjøp BTC nå»).
   - `explain-trade` forklarer *hvorfor* en strategi tok et valg, og gir et pedagogisk læringspoeng — uten å oppfordre til ny handling.
   - AI-en skal være støttende ved tap og påminne om risikostyring, ikke om å øke eksponering.

2. **Bundet av risikogrenser og tier-rettigheter**
   - Alle AI-genererte signaler eller forslag som fører til ordre må passere `checkTradeRisk` i `src/lib/trading/canonical/risk/risk-engine.ts`.
   - Relevante grenser inkluderer: risikoprofil (`safe`/`moderate`/`aggressive`), maks posisjon/prosent, eksponering, daglig tap, tillatte par, gearing og saldo.
   - `user_profiles.tier` styrer om live-modus er tilgjengelig; papir er alltid tilgjengelig for trening.
   - Hvis `checkTradeRisk` returnerer `allowed: false`, blokkeres utførelsen; AI-en skal ikke forsøke å omgå sjekken.

3. **Menneskelig bekreftelse før auto-utførelse**
   - Ingen auto-trade skal kjøres uten eksplisitt brukersamtykke (opt-in for `auto_trading_enabled`, `useAI` og en bekreftelsesgate).
   - `AutoTradingEngine` logger beslutninger, men faktisk ordreutførelse rutes gjennom den kanoniske execute-pipelinen (`/api/paper-trading/execute`, `/api/trading/execute` e.l.) som krever autentisering og menneskelig bekreftelse.
   - I live-modus kreves ytterligere manuell godkjenning (f.eks. i Cockpit eller mobilnotifikasjon) før ordre sendes til Binance.

4. **Markedsplass-krok for Cockpit**
   - En lettvekts RPC `public.get_marketplace_ready_listings(p_limit integer, p_offset integer)` eksponerer publiserte strategier fra `marketplace_listings` med materialiserte statistikker fra `marketplace_listing_stats`.
   - RPC-en er leseonly og er tenkt som en katalogkrok for fremtidig Cockpit-UI; kopiering/abonnement skjer via autentiserte server-API-er med brukerbekreftelse.
   - Se eksisterende ADR [`ADR-2026-03-20-KLA-91-strategy-marketplace.md`](./ADR-2026-03-20-KLA-91-strategy-marketplace.md) for datamodell.

## Konsekvenser

- **Sikkerhet:** AI kan ikke overstyre risikomotoren eller brukerens tier.
- **Tillit:** Brukeren får pedagogisk verdi uten at AI-en oppfører seg som rådgiver.
- **Compliance:** Menneskelig bekreftelse reduserer risiko for uautorisert auto-handel.
- **Utvikling:** Fremtidige AI-funksjoner (f.eks. «AI coach») må implementeres innenfor disse rammene.

## Verifikasjon

- `npm run lint:gate` skal være grønn.
- `npm run type-check` skal være grønn.
- Migration `supabase/migrations/20260709000000_marketplace_ready_listings_rpc.sql` skal applyes lokalt via `supabase db push` (eller `supabase migration up`).

## Referanser

- `src/app/api/ai/explain-trade/route.ts`
- `src/lib/ai/auto-trading-engine.ts`
- `src/lib/trading/canonical/risk/risk-engine.ts`
- `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md`
- `docs/adr/ADR-2026-03-20-KLA-91-strategy-marketplace.md`
- `supabase/migrations/20260320000000_kla91_marketplace_listing_stats.sql`
- `supabase/migrations/20260709000000_marketplace_ready_listings_rpc.sql`
