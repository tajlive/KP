# KLA-91 — Strategy Marketplace (arkitekturskisse)

**ADR (beslutning logget):** `docs/adr/ADR-2026-03-20-KLA-91-strategy-marketplace.md`  
**Roadmap Cursor/KIMI:** `docs/architecture/KLA-91-ROADMAP-CURSOR-KIMI.md`

**Status:** Skisse for implementasjon. **Kilde i kode:** `src/app/api/marketplace/listings/route.ts`, `src/app/api/marketplace/subscribe/route.ts`, migrasjon `20260302000000_dashboard_and_copy_trading.sql` + `20260320000000_kla91_marketplace_listing_stats.sql`.

## Mål

- Selger publiserer strategi som **listing**; kjøper abonnerer / følger med kontrollert RLS.
- Unngå direkte klient-skriv mot sensitive tabeller uten validering og eierskapssjekk.

## Datamodell (Supabase)

| Tabell                      | Formål                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `marketplace_listings`      | Publisert tilbud: tittel, beskrivelse, pris, kategori, status, `seller_id`, `strategy_id` → `user_strategies` |
| `marketplace_subscriptions` | Kjøper ↔ listing, status, ev. `user_strategy_id`                                                              |
| `user_strategies`           | Løpende bruker-strategi; flagg `is_public`, `is_marketplace_listed` (utvidet i migrasjon)                     |
| `strategies`                | Egen «offentlige» strategi-rader (copy/marketplace-legacy); RLS: `is_public = true OR user_id = auth.uid()`   |

**Merk:** Markedsplass-API bør primært lese **`marketplace_listings`**. Fallback mot `public.strategies` må matche faktiske kolonner i DB (unngå `is_marketplace_listed` på `strategies` hvis kolonnen ikke finnes — synkroniser migrasjon + `supabase-generated`).

## Typer (eksporter fra repo)

```ts
import type { Database } from "@/types/supabase-generated";

export type MarketplaceListingRow =
  Database["public"]["Tables"]["marketplace_listings"]["Row"];
export type MarketplaceListingInsert =
  Database["public"]["Tables"]["marketplace_listings"]["Insert"];
export type MarketplaceSubscriptionRow =
  Database["public"]["Tables"]["marketplace_subscriptions"]["Row"];
export type UserStrategyRow =
  Database["public"]["Tables"]["user_strategies"]["Row"];
export type StrategyRow = Database["public"]["Tables"]["strategies"]["Row"];
```

DTO-er for API (camelCase) beholdes i route-filer eller `src/lib/marketplace/types.ts`.

## Filer å opprette / utvide

| Fil                                              | Ansvar                                                        |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `src/lib/marketplace/types.ts`                   | Delte Zod-schemaer + DTO-typer for listings/subscribe         |
| `src/lib/marketplace/queries.ts`                 | Supabase-spørringer (server-only) med typete `select`         |
| `src/app/api/marketplace/listings/route.ts`      | Allerede; konsolidér fallback og validering                   |
| `src/app/api/marketplace/subscribe/route.ts`     | Valider Stripe/tier + RLS-vennlig insert                      |
| `src/app/[locale]/marketplace/page.tsx`          | Offentlig katalog (eller under `dashboard`)                   |
| `src/app/[locale]/dashboard/strategies/page.tsx` | Innlogget oversikt `strategies` / egne listings               |
| `src/components/strategy-marketplace/*`          | Kort, filtre, `StrategyMetadataForm`                          |
| `src/lib/strategy-form-gen.ts`                   | Zod + defaults for metadata                                   |
| `supabase/migrations/*`                          | Nye indekser / policies kun ved behov; kjør `npm run db:lint` |

## API-struktur

- `GET /api/marketplace/listings?page&limit&category&sort` — publiserte listings (+ valgfri auth for personalisering).
- `POST /api/marketplace/listings` (fremtidig) — opprett/oppdater listing; body validert med Zod; `seller_id` = session user.
- `POST /api/marketplace/subscribe` — eksisterende; sikre at `subscriber_id` alltid settes fra session, ikke fra body alene.

## RLS (retningslinjer)

- **Listings:** Published synlig for alle; eier ser egne utkast — allerede i migrasjon.
- **Subscriptions:** Kun egen `subscriber_id` — allerede.
- **`strategies`:** Kun offentlige + egne rader — eksisterende policy; ikke åpne `FOR ALL` til `anon` for persondata.
- **Service role:** Kun server-side Edge Functions / API routes som allerede bruker service key — aldri i browser.

## Feilmodus

- Tom datasett: returner `[]`, ikke `null` til klient.
- RLS nektet: 401/403 + strukturert feil, ikke rå Supabase-melding til UI.
- Nettverk: retry med backoff på server der det er trygt.

---

## PR-mal (lim inn i GitHub PR)

```markdown
## KLA-91 Strategy Marketplace

### Sjekkliste

- [ ] `marketplace_listings` / `marketplace_subscriptions` brukt i tråd med RLS
- [ ] Zod på alle nye API-body
- [ ] Typer fra `@/types/supabase-generated` (eller bevisst DTO + mapping)
- [ ] next-intl: nøkler for `no`, `en`, `th`, `zh` for nye strenger
- [ ] Lister: `Array.isArray(x) ? x : []` før `.map`
- [ ] `npm run test:ci` grønn
- [ ] Ingen nye hemmeligheter i klientbundle

### Dokumentasjon

- Oppdatert: `docs/architecture/KLA-91-strategy-marketplace.md` (hvis endret kontrakt)

### Testplan

- E2E: [beskriv happy path subscribe / listing]
- Enhet: [Zod / mapping]
```
