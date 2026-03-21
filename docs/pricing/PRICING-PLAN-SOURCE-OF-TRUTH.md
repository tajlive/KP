# Prisplan — source of truth (Klarpakke)

**Formål:** Én felles sannhet for produkt (pris, plan-navn, hovedgrenser) som både **Linear** og **kodebase** følger.

| Rolle                             | Hvor                                                                                                                                   | Merknad                                                                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Produkt / beslutning**          | Linear **[KLA-236](https://linear.app/klarpakke/issue/KLA-236)** (**Done** mars 2026 — opprett **ny** issue ved neste pris/plan-runde) | Historikk i kommentarer                                                                                                                                        |
| **Implementasjon (runtime)**      | [`src/lib/pricing/tiers.ts`](../../src/lib/pricing/tiers.ts)                                                                           | Må matche tabellen under etter endring                                                                                                                         |
| **Brukertekst (navn + features)** | `messages/no/studieprogram.json` + `messages/en/studieprogram.json` (`tiers.*`)                                                        | **SoT:** kun **no** + **en** — samme regel for _alle_ oversettelser, se [`docs/i18n/LOCALE-SCOPE-SOURCE-OF-TRUTH.md`](../i18n/LOCALE-SCOPE-SOURCE-OF-TRUTH.md) |
| **Stripe Checkout (price IDs)**   | Vercel env — se tabell nedenfor + [`src/app/api/stripe/checkout/route.ts`](../../src/app/api/stripe/checkout/route.ts)                 | Faktisk belastning                                                                                                                                             |

Ved endring: **oppdater Linear først** (eller samtidig med PR), deretter `tiers.ts`, oversettelser og Stripe/Vercel om nødvendig.

---

## Marked, språk og scope (pris + checkout)

**Overordnet i18n-policy (alle oversettelser, ikke bare pris):** [`docs/i18n/LOCALE-SCOPE-SOURCE-OF-TRUTH.md`](../i18n/LOCALE-SCOPE-SOURCE-OF-TRUTH.md) — aktiv SoT = **no + en**; **th/zh avvent** for alt brukervendt innhold.

| Status        | Locale            | Prising & checkout (produktbeslutning)                                                                                                                                   |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Aktiv SoT** | **no** (Norge)    | NOK, Vipps-region, norsk skatterapport-fortelling — full støtte.                                                                                                         |
| **Aktiv SoT** | **en**            | Engelsk copy skal matche samme planer/tall som `tiers.ts`; checkout kan tilby **NOK / EUR / USD** med faste Stripe-priser (se multi-valuta under + `pricing.config.ts`). |
| **Avventer**  | **th** (Thai)     | Ingen SoT for pris/valuta/checkout; `messages/th/*` er **ikke** kanon for produkttekst (se locale-dok over).                                                             |
| **Avventer**  | **zh** (kinesisk) | Samme som **th**.                                                                                                                                                        |

**Konsekvens:** Nye prisendringer skal **alltid** reflekteres i **no + en** (`studieprogram`, `pricing` der relevant) og i denne filen. **th/zh** holdes utenfor leveransekrav inntil policy endres eksplisitt i locale-SoT.

---

## Planer (kanonisk mars 2026)

Slugs brukes i URL (`?plan=`), DB og Stripe-metadata.

| Slug        | Visningsnavn | Pris (NOK/mnd) | KLT signup | KLT / mnd | Auto-strategier (live) | Trial (dager) | Live trading      |
| ----------- | ------------ | -------------- | ---------- | --------- | ---------------------- | ------------- | ----------------- |
| `student`   | Student      | 0              | 500        | 0         | 1                      | 14 full prøve | Nei (etter trial) |
| `bachelor`  | Bachelor     | 249            | 0          | 1 000     | 3                      | 0             | Ja                |
| `master`    | Master       | 499            | 0          | 2 500     | 7                      | 0             | Ja                |
| `phd`       | PhD          | 999            | 0          | 5 000     | Ubegrenset             | 0             | Ja                |
| `professor` | Professor    | 1 999          | 0          | 10 000    | Ubegrenset             | 0             | Ja                |

**Skatterapport (CSV/HTML, Skatteetaten):** fra **Bachelor** og oppover (`/api/tax-report` + dashboard). Student har ikke tilgang.

**Merk:** `/priser` viser alle fem planer med pris fra `TIERS` (`priser-plans.ts`).

---

## Multi-valuta: NOK, EUR og USD (alle kunder)

**Mål:** Hver kunde kan betale i **NOK**, **EUR** eller **USD** via Stripe Checkout. Hver valuta = **eget Stripe Price-objekt** (fast beløp i den valutaen), ikke live valutakonvertering i kassen.

| Rolle                               | Kilde                                                          | Kommentar                                                     |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- | --- | ------------------------------------------------------- |
| **Listepris SoT (Norge / produkt)** | `tiers.ts` (`priceNOK`) + tabellen over                        | Kanonisk månedlig NOK for plan-tabell og norsk markedsføring. |
| **Stripe + alle valutaer**          | [`src/lib/pricing.config.ts`](../../src/lib/pricing.config.ts) | `TIER_CONFIGS[*].prices.NOK                                   | EUR | USD`—`amount`+`priceId` per plan og periode (måned/år). |

**Bør vi justere EUR/USD når vi åpner valg for alle?**

- **Nei, ikke automatisk** bare fordi alle får velge valuta — dere beholder **NOK** som referanse, og **EUR/USD** som egne avrundede prispunkter (typisk «psykologiske» beløp, ikke daglig spotkurs).
- **Ja, hvis** (1) beløp i Stripe Dashboard ikke matcher `pricing.config.ts`, (2) kurs har flyttet seg mye og internasjonale priser føles urimelige vs. NOK, eller (3) dere vil unngå stor **opplevd** prisforskjell mellom markeder. Anbefalt: **periodisk gjennomgang** (f.eks. kvartalsvis) av EUR/USD mot NOK-listen.
- **Professor:** sørg for at `priceId` er satt for alle valutaer som tilbys (i dag ofte tom i config — må opprettes i Stripe og inn i repo/Vercel).

**Implementasjon:** Checkout-API må bruke **riktig `price_` for valgt valuta** (ikke kun én env-var per plan). Inntil det er på plass, kan env `NEXT_PUBLIC_STRIPE_PRICE_*` være NOK-månedlig fallback.

---

## Stripe-miljøvariabler (Checkout)

**Multi-valuta (månedlig abonnement):** preferert mønster er `NEXT_PUBLIC_STRIPE_PRICE_{TIER}_{CUR}` — se [`STRIPE-CHECKOUT-MULTI-CURRENCY.md`](./STRIPE-CHECKOUT-MULTI-CURRENCY.md) og `.env.local.example`.

| Env-variabel (eksempel)                                    | Plan-slug  | Valuta |
| ---------------------------------------------------------- | ---------- | ------ |
| `NEXT_PUBLIC_STRIPE_PRICE_BACHELOR` eller `…_BACHELOR_NOK` | `bachelor` | NOK    |
| `NEXT_PUBLIC_STRIPE_PRICE_BACHELOR_EUR`                    | `bachelor` | EUR    |
| `NEXT_PUBLIC_STRIPE_PRICE_BACHELOR_USD`                    | `bachelor` | USD    |
| (tilsvarende for `MASTER`, `PHD`, `PROFESSOR`)             | …          | …      |

`student` krever ikke Stripe-pris (gratis).

**Konfig i kode:** Full matrise (NOK/EUR/USD × plan × måned/år) og innebygde `priceId` ligger i `src/lib/pricing.config.ts`. **Env overstyrer** disse når satt (for prod uten å committe `price_`).

**Eldre / alternative referanser:** `src/lib/stripe.ts` (STRIPE_PLANS) og `scripts/setup-stripe.ts` kan ha **avvikende** beløp eller navn — ikke bruk dem som sannhet uten å avstemme mot denne filen og `tiers.ts`.

---

## Relaterte Linear-oppgaver

- **KLA-226–KLA-230** — tier i prod, DB, typer (se `docs/LINEAR-2026-STANDARD.md`)
- **KLA-236** — prisplan SoT (lukket; videre endringer = ny Linear-sak + oppdatering her)

---

## Endringslogg (repo)

| Dato       | Endring                                                                                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-20 | Første versjon: dokument + Linear KLA-236                                                                                                                                         |
| 2026-03-20 | **th** og **zh** satt til _avvent_ for pris-/checkout-SoT; aktiv SoT = **no** + **en**                                                                                            |
| 2026-03-20 | Policy utvidet: **samme no/en vs th/zh** for _alle_ oversettelser — se `docs/i18n/LOCALE-SCOPE-SOURCE-OF-TRUTH.md`                                                                |
| 2026-03-20 | **Multi-valuta:** NOK som listepris-SoT; EUR/USD som faste Stripe-priser i `pricing.config.ts` — ingen automatisk justering ved valgfri valuta; gjennomgå ved avvik eller jevnlig |
| 2026-03-20 | Checkout: valg NOK/EUR/USD i UI; API løser `price_` fra `tier` + `currency` (env `NEXT_PUBLIC_STRIPE_PRICE_*_*`) — se `STRIPE-CHECKOUT-MULTI-CURRENCY.md`                         |
| 2026-03-20 | Årlige Stripe-priser (live) + config; trial 14 d.; Customer Portal API + Innstillinger; webhooks-dok — se `STRIPE-WEBHOOKS-AND-PORTAL.md`                                         |
| 2026-03-20 | Stripe Checkout: **ingen prøveperiode på Bachelor**; 14 d. trial for Master/PhD/Professor (`getStripeCheckoutTrialDays`)                                                          |
