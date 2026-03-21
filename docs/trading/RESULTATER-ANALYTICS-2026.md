# Resultater & analytics (2026)

## Hva som ble levert

- **Rute:** `/{locale}/dashboard/resultater` — innlogget side med KPI-kort, kumulativ P&L (area), vinn/tap (donut), daglige søyler (grønn/rød), topp par og fordeling etter modus.
- **API:** `GET /api/user/trading-analytics` — autentisert, henter opptil 4000 siste handler for brukeren, returnerer aggregater og serier for grafer (ingen cache; `Cache-Control: private, no-store`).
- **«Live» hvert 5. min:** Klienten kaller API på nytt hvert **5. minutt** og når fanen blir synlig igjen (`visibilitychange`).
- **Supabase cron:** Migrasjon `20260320140000_pg_cron_sync_prices_5min_analytics.sql` planlegger **`klarpakke-sync-prices-5min`** (`*/5 * * * *`) som kaller **`GET https://www.klarpakke.no/api/cron/sync-prices`** med `Authorization: Bearer <CRON_SECRET>`. Det holder Binance-sporpriser oppdatert som underlag for portefølje-/dashboard-views (jf. eksisterende sync-prices-route).

## Konkurrenter / marked forventning (kort)

- **Kumulativ P&L / «equity curve»** over valgt periode (f.eks. Crypto.com P&L-dashboard, dedikerte trackers som Pnalyze).
- **Flere tidshorisontar** (dag / uke / måned) — vi har så langt **auto 5 min + siste ~42 dager** på dagdiagram; kurven er full historikk innenfor sample.
- **Vinnrate og fordeling vinn-tap** — standard i profesjonelle journal- og analytics-verktøy.
- **Per aktivum (pair)** og **modus** — i Klarpakke skal **tallflaten** (kort, grafer, NOK) være **lik for øving og live**; modus vises diskret der det trengs til sporbarhet.

Anbefaling videre: eksplisitte **tidsfiltre** (7d / 30d / YTD), **eksport CSV**, og **urealisert P&L** når live-posisjoner finnes i DB. Se også `docs/product/KONKURRANSE-OG-BRUKERRESULTAT-2026.md`.

## Drift: Supabase etter `db push`

1. Verifiser at `app.settings.cron_secret` er satt (samme verdi som `CRON_SECRET` i Vercel):

   ```sql
   ALTER DATABASE postgres
     SET "app.settings.cron_secret" = 'din-hemmelighet-fra-vercel';
   ```

2. Kjør migrasjonen (eller kjør innholdet i SQL Editor hvis dere ikke bruker `db push` på denne filen ennå).

3. Sjekk jobb:

   ```sql
   SELECT jobname, schedule, active FROM cron.job
   WHERE jobname = 'klarpakke-sync-prices-5min';
   ```

## Bevis / verifikasjon etter deploy (Vercel)

Erstatt `CRON_SECRET` og eventuelt domene lokalt.

```bash
# 1) Prissync (cron-endepunkt — skal returnere JSON med ok)
curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.klarpakke.no/api/cron/sync-prices"

# 2) Bruker-analytics (krever innlogget session — for manuell test bruk nettleser på /no/dashboard/resultater)
#    eller kjør fra dev med gyldige cookies.

# 3) Prosjekt-verify (hvis konfigurert)
npm run verify
```

**Forventet:** (1) HTTP `200` og body med suksess fra sync-prices; (2) resultatsiden laster uten feil og viser «Sist oppdatert»; etter 5 minutter oppdateres tidsstempel automatisk.

## Arkitektur-notat

- Brukerdata for grafer kommer direkte fra `trades` (service role etter session-auth i API-et), ikke fra cron-jobb — cron-jobb er **pris- og infrastruktur-puls**, ikke per-bruker batch.
- Unngå Vercel Cron som kilde; se `docs/CRON-SOURCE-OF-TRUTH.md`.
