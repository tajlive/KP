# Stripe Checkout — NOK, EUR, USD

## Hva som er implementert

- Kassen (`/[locale]/checkout`) har **valg av betalingsvaluta** (NOK / EUR / USD).
- `POST /api/stripe/checkout` sender **`tier` + `currency`** og velger Stripe **`price_`** via `getResolvedSubscriptionPriceId()` i [`src/lib/pricing.config.ts`](../../src/lib/pricing.config.ts).
- Når `currency` er satt, **ignoreres** klientens `priceId` — serveren velger alltid riktig Price for valutaen (unngår mismatch).
- **Oppdatere Stripe?** Det må gjøres i **Stripe Dashboard** (eller CLI/API) hos dere: opprett **subscription prices** med riktig **valuta og beløp** per plan, og lim inn `price_…` i Vercel env eller i `pricing.config.ts`.

## Miljøvariabler (anbefalt i prod)

Se `.env.local.example`. Mønster:

`NEXT_PUBLIC_STRIPE_PRICE_{TIER}_{CUR}` der `{TIER}` er `BACHELOR` | `MASTER` | `PHD` | `PROFESSOR` og `{CUR}` er `NOK` | `EUR` | `USD`.

**NOK** kan også settes som før uten `_NOK`: `NEXT_PUBLIC_STRIPE_PRICE_BACHELOR` (leses som NOK etter at `_NOK` er sjekket).

## Manuell sjekkliste i Stripe

1. For hver betalt plan: tre **recurring monthly** prices (NOK, EUR, USD) med beløp som matcher `TIER_CONFIGS` i `pricing.config.ts` (eller bevisst avvikende produktbeslutning).
2. Kopier hver `price_…` inn i Vercel for tilsvarende env-nøkkel.
3. **Professor** krever egne prices — `priceId` var tidligere ofte tom i config; uten env + Stripe-pris feiler checkout for den planen.

## Live `price_` (synk mars 2026)

Månedlig abonnement på produktene `prod_U2VWXz4j0xcxIG` (Bachelor), `prod_U2VWVXYn2qFnoZ` (Master), `prod_U2VWl8v0Vbb5Zq` (PhD), `prod_U2VWZ6Ui4zQb4w` (Professor). **EUR/USD** ble opprettet i Stripe; **NOK** var allerede satt. ID-er ligger i `src/lib/pricing.config.ts` (`monthly` per valuta).

| Plan      | NOK (mnd)                        | EUR (mnd)                        | USD (mnd)                        |
| --------- | -------------------------------- | -------------------------------- | -------------------------------- |
| Bachelor  | `price_1T4QVJCGsVawsLofgt9uuOcU` | `price_1TD5UECGsVawsLof3Zq0XC0N` | `price_1TD5UECGsVawsLofmqsT6zeV` |
| Master    | `price_1T4QVKCGsVawsLofr8NPcL6g` | `price_1TD5UECGsVawsLofd2IVqjqz` | `price_1TD5UECGsVawsLofRg6WfI78` |
| PhD       | `price_1T4QVKCGsVawsLofz1US0uVZ` | `price_1TD5UHCGsVawsLofRydZEMDV` | `price_1TD5UHCGsVawsLofVsnaqzju` |
| Professor | `price_1T4QVLCGsVawsLofgMEbOBJA` | `price_1TD5UHCGsVawsLofU8a1xR2R` | `price_1TD5UHCGsVawsLof59k680pJ` |

**Vercel:** Sett `NEXT_PUBLIC_STRIPE_PRICE_*`-variabler til verdiene over hvis du vil overstyre repo (valgfritt — fallback er allerede i kode). Se også `.env.local.example` for utkopierte live-ID-er (kommentert).

### Årlig abonnement (Stripe live, synk mars 2026)

Opprettet som **recurring `interval: year`** på samme fire produkter. ID-er ligger i `pricing.config.ts` under `annual`. **Checkout i appen bruker fortsatt kun månedlig** — årlig er klart for fremtidig UI eller manuell lenke.

| Plan      | NOK (år)                         | EUR (år)                         | USD (år)                         |
| --------- | -------------------------------- | -------------------------------- | -------------------------------- |
| Bachelor  | `price_1TD5XUCGsVawsLofbj6ktwDa` | `price_1TD5XUCGsVawsLofXlcxk5A1` | `price_1TD5XVCGsVawsLofOqWoAoyR` |
| Master    | `price_1TD5XWCGsVawsLof3f6PuDeR` | `price_1TD5XWCGsVawsLoftCdFoaKP` | `price_1TD5XWCGsVawsLofbDiSzmj1` |
| PhD       | `price_1TD5XaCGsVawsLof2WPouGjI` | `price_1TD5XbCGsVawsLofKVCUcDvN` | `price_1TD5XdCGsVawsLofx1KeLaTQ` |
| Professor | `price_1TD5XdCGsVawsLofXPUaShSU` | `price_1TD5XdCGsVawsLofPJufBcMk` | `price_1TD5XdCGsVawsLof8pKnV12d` |

## Relatert SoT

- [`PRICING-PLAN-SOURCE-OF-TRUTH.md`](./PRICING-PLAN-SOURCE-OF-TRUTH.md) — plan-navn og NOK-listepris i `tiers.ts`.
- [`STRIPE-WEBHOOKS-AND-PORTAL.md`](./STRIPE-WEBHOOKS-AND-PORTAL.md) — webhooks og Customer Portal.
