# KLA-91 — Strategy Marketplace (Chief Architect / delegasjon til Kimi)

**Mål:** Brukere publiserer strategier (navn, beskrivelse, nøkkeltall, performance); andre blar, filtrerer (return %, risiko), **kopierer** til egen bruk; data i **Supabase** med **realtime**; **RLS** så kun eier kan endre egne strategier.

**Eksisterende repo-grunnlag:** `marketplace_listings`, `marketplace_subscriptions`, `user_strategies`, `strategies` (se `supabase/migrations/20260302000000_dashboard_and_copy_trading.sql` + `20260201150000_mvp_extensions_strategies_referrals_billing.sql`). Kimi skal **utvide/konsolidere**, ikke duplisere tabeller uten behov.

---

## 1. Database schema (Supabase migrations SQL)

**Prinsipp:** Skill **katalog** (hva som vises på marketplace) fra **kjørende instans** (brukerens `user_strategies` etter copy).

### 1.1 Tabeller (logisk modell)

| Tabell                                       | Rolle                                                                                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `marketplace_listings`                       | Publisert oppføring: tittel, beskrivelse, pris, status, `seller_id`, peker til `strategy_id` (`user_strategies`) eller fremtidig `strategies.id` — **én kilde for «browse»** |
| `marketplace_listing_stats` _(ny, anbefalt)_ | Materialiserte/agregerte felt for filtrering: `return_30d_pct`, `return_90d_pct`, `max_drawdown_pct`, `risk_tier`, `last_computed_at` — oppdatert av cron/edge etter trades  |
| `user_strategies`                            | Brukerens faktiske strategi-instans (paper/live); **copy** = ny rad med `copied_from_listing_id` eller `forked_from_user_strategy_id`                                        |
| `strategies`                                 | Evt. «master»-rad per creator (legacy/copy-flow); hold synk med RLS i eksisterende migrasjoner                                                                               |
| `strategy_copy_events` _(valgfri, audit)_    | `user_id`, `listing_id`, `created_user_strategy_id`, `created_at` — analytics + misbruk                                                                                      |

### 1.2 Migrasjon — pseudokode SQL (Kimi fyller ut typer, defaults, FK)

```sql
-- A) Utvid marketplace_listings med felter for søk/filter (hvis ikke allerede dekket)
-- ALTER marketplace_listings ADD COLUMN IF NOT EXISTS risk_tier text CHECK (...);
-- ADD return_snapshot jsonb DEFAULT '{}';  -- eller normaliser til listing_stats

-- B) Ny tabell: marketplace_listing_stats (1:1 med listing_id)
CREATE TABLE IF NOT EXISTS public.marketplace_listing_stats (
  listing_id uuid PRIMARY KEY REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  return_30d_pct  numeric,
  return_90d_pct  numeric,
  max_drawdown_pct numeric,
  sharpe_ratio     numeric,
  win_rate_pct     numeric,
  risk_tier        text NOT NULL CHECK (risk_tier IN ('low','medium','high')),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_listing_stats ENABLE ROW LEVEL SECURITY;

-- C) RLS listing_stats: alle autentiserte (eller public) kan SELECT published;
--    kun service_role eller eier-trigger skriver
CREATE POLICY "stats_select_published_listings"
  ON public.marketplace_listing_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings ml
      WHERE ml.id = listing_id
        AND (ml.status = 'published' OR ml.seller_id = auth.uid())
    )
  );

-- D) user_strategies: spor for copy
ALTER TABLE public.user_strategies
  ADD COLUMN IF NOT EXISTS copied_from_listing_id uuid
    REFERENCES public.marketplace_listings(id) ON DELETE SET NULL;

-- E) Indekser for filter/sort
CREATE INDEX IF NOT EXISTS idx_listing_stats_risk_return
  ON public.marketplace_listing_stats (risk_tier, return_30d_pct DESC NULLS LAST);

-- F) Realtime: publicering av listings + stats (Supabase replication)
--    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_listings;
--    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_listing_stats;
```

**Merk:** Aggregerte stats bør **ikke** beregnes i klient; bruk worker/cron eller database-funksjon trigget ved `trades` / session-oppdatering.

---

## 2. TypeScript types (`src/types/strategy.ts`)

**Fil opprettes av Kimi.** Innhold = rene typer + DTO-er; **ingen** forretningslogikk.

```ts
// Pseudostruktur — importer Database-rader der mulig:
// import type { Database } from '@/types/supabase-generated';

// export type MarketplaceListingRow = Database['public']['Tables']['marketplace_listings']['Row'];
// export type MarketplaceListingStatsRow = ...

/** API-respons: liste med join stats + seller preview */
export type StrategyMarketplaceItem = {
  // id, title, description, sellerId, sellerDisplayName,
  // riskTier, return30dPct, return90dPct, winRatePct, ...
};

export type StrategyMarketplaceFilters = {
  minReturn30d?: number;
  riskTier?: "low" | "medium" | "high";
  // pagination, sortKey, ...
};

export type CopyStrategyRequestBody = {
  // listingId: string; optional: targetMode 'paper' | 'live'
};

export type CopyStrategyResponse = {
  // newUserStrategyId: string;
};
```

**Regel:** Server validerer med **Zod**; typer i `strategy.ts` speiler DTO, ikke rå JSON fra klient.

---

## 3. API routes structure

| Metode   | Route                              | Formål                                                                                      | Auth                      |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------- |
| `GET`    | `/api/strategies`                  | Liste publiserte strategier + stats; query: `risk`, `minReturn30d`, `sort`, `page`, `limit` | Valgfri (personalisering) |
| `GET`    | `/api/strategies/[listingId]`      | Detalj én listing + seller + stats                                                          | Valgfri                   |
| `POST`   | `/api/strategies`                  | Opprett/publiser listing (seller)                                                           | Påkrevd                   |
| `PATCH`  | `/api/strategies/[listingId]`      | Oppdater egen listing (draft/published fields)                                              | Påkrevd, eier             |
| `POST`   | `/api/strategies/[listingId]/copy` | Kopier til `user_strategies` for innlogget bruker                                           | Påkrevd                   |
| `DELETE` | `/api/strategies/[listingId]`      | Arkiver/unpublish (soft)                                                                    | Påkrevd, eier             |

**Implementasjonsnotat:** Eksisterende `/api/marketplace/listings` kan **sammenslås** med `/api/strategies` for å unngå to parallelle API-flater — Chief Architect anbefaler **én RESTflate** (`/api/strategies` som canonical) og deprecate/redirect marketplace-ruter senere.

**Pseudokode (route handler):**

```ts
// GET /api/strategies
// 1. parseQuery → Zod
// 2. supabaseServer.from('marketplace_listings').select('*, marketplace_listing_stats(*)')
//    .eq('status','published').order(...)
// 3. apply filters in SQL where possible (return_30d_pct >= ?)
// 4. return { items, total, page }

// POST /api/strategies/[id]/copy
// 1. requireSession()
// 2. load listing + source user_strategy (policy: published)
// 3. insert user_strategies row (copy config, mode paper default, copied_from_listing_id)
// 4. optional: insert strategy_copy_events
// 5. return { newUserStrategyId }
```

---

## 4. React hooks struktur

| Hook                | Fil (forslag)                        | Ansvar                                                                                                                                                      |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useStrategies`     | `src/lib/hooks/useStrategies.ts`     | `GET /api/strategies` med SWR/React Query; debounce filter; **subscribe** Realtime på `marketplace_listings` + `marketplace_listing_stats` for invalidering |
| `useStrategyDetail` | `src/lib/hooks/useStrategyDetail.ts` | `GET /api/strategies/[id]`                                                                                                                                  |
| `useCopyStrategy`   | `src/lib/hooks/useCopyStrategy.ts`   | `mutation` → `POST .../copy`; toast; router refresh                                                                                                         |
| `useMyListings`     | `src/lib/hooks/useMyListings.ts`     | Seller dashboard: egne listings                                                                                                                             |

**Pseudokode (Realtime):**

```ts
// useStrategies()
// const channel = supabase.channel('marketplace')
//   .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, () => queryClient.invalidateQueries(['strategies']))
//   .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listing_stats' }, ...)
//   .subscribe();
// return () => { supabase.removeChannel(channel); };
```

**Klientside:** Bruk **én** browser-Supabase-klient (`createClient` fra `@/lib/utils`); aldri service role i hooks.

---

## 5. Security checklist

### RLS

- [ ] `marketplace_listings`: `SELECT` der `status = 'published' **OR** seller_id = auth.uid()` (allerede nær dette i repo — verifiser).
- [ ] `marketplace_listings`: `INSERT/UPDATE/DELETE` kun `seller_id = auth.uid()`.
- [ ] `marketplace_listing_stats`: `SELECT` kun for published listings (eller eier ser egne utkast via join).
- [ ] `marketplace_listing_stats`: **ingen** direkte `INSERT/UPDATE` fra `authenticated` — kun `service_role` eller `SECURITY DEFINER` funksjon med guards.
- [ ] `user_strategies`: fortsatt `user_id = auth.uid()` for mutasjoner; **copy** oppretter rad med **ny** `user_id` = caller (server verifiserer).
- [ ] Ingen policy som lar bruker sette `seller_id` / `user_id` til annen bruker via klient.

### API / validering

- [ ] Alle `POST`/`PATCH` body → **Zod**; avvis ukjente nøkler (`strict()`).
- [ ] Rate limit på `/copy` (Upstash / middleware) for å hindre spam.
- [ ] `copy`: verifiser at kilde-listing er `published` og at `strategy_id` tilhører seller (eller eksplisitt whitelisted felt).
- [ ] Ikke eksponer rå feil fra Supabase til klient (map til koder).

### Realtime

- [ ] Realtime aktivert kun på tabeller som **ikke** lekker private felt; bruk RLS-aware subscriptions (Supabase respekterer RLS for authenticated channels).

---

## 6. Test plan outline (E2E)

**Playwright — flow «browse → filter → copy»**

1. **Setup:** seed `marketplace_listings` (published) + `marketplace_listing_stats` med variert `risk_tier` og `return_30d_pct` (via fixture eller test API).
2. **Browse:** åpne `/[locale]/marketplace` (eller `/dashboard/strategies` når ruten er canonical); forvent synlige kort.
3. **Filter:** sett filter `risk = medium`, `minReturn30d = X`; forvent at antall synlige kort reduseres riktig.
4. **Copy:** klikk «Kopier» som innlogget testbruker; forvent success-toast og at ny rad finnes i `user_strategies` (via API assert eller UI «Mine strategier»).
5. **Realtime (valgfri E2E):** trigger oppdatering av listing i annen kontekst; forvent at liste refreshes (eller manuell `invalidate` observeres i dev).

**Vitest:** Zod-schema for query params + copy body; mapping DTO ↔ DB row.

---

## Leveranse til Kimi (rekkefølge)

1. Migrasjon: `marketplace_listing_stats` + RLS + indekser + `user_strategies.copied_from_listing_id`.
2. `src/types/strategy.ts` + Zod i `src/lib/strategies/*.ts` (eller marketplace).
3. API: implementer `GET/POST /api/strategies` og `POST .../copy`; vurder konsolidering med `marketplace/listings`.
4. Hooks + UI-kort (eksisterende komponenter gjenbrukes der mulig).
5. E2E + enhetstester som over.

**Ikke inkludert i denne leveransen:** full produksjonskode — kun denne strukturen.
