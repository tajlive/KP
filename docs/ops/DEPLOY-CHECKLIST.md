# Hermes Lead Architect — Deploy Sjekkliste

> Automatisk sjekkliste for hver deploy. Følges av Hermes Agent.

## Før push
- [ ] `npx tsc --noEmit` — 0 feil
- [ ] `npx vitest run src/middleware/rateLimit.test.ts` — 3/3 passerer
- [ ] `npx eslint` — ingen varsler på endrede filer
- [ ] Pre-commit hooks passerte (automatisk)

## Etter push
- [ ] GitHub Actions: `Deploy to Cloudflare Workers` — grønn
- [ ] Sjekk `curl https://www.klarpakke.no/api/health` — `status: healthy`
- [ ] Sjekk `curl https://www.klarpakke.no/no/priser` — HTTP 200, ingen "Noe gikk galt"
- [ ] Sjekk versjon: `curl https://www.klarpakke.no/api/health | jq .version` — matcher siste commit

## Daglig
- [ ] SSL-sertifikat: utløper 28. august 2026
- [ ] Binance connectivity: OK (via Supabase proxy)
- [ ] Database: Supabase oppe, cron jobs kjører
- [ ] Stripe webhook: aktiv
- [ ] Resend: API-nøkkel gyldig

## Ukentlig
- [ ] `npm outdated` — sjekk store oppdateringer
- [ ] `npm audit` — sikkerhetshull
- [ ] Supabase: sjekk migration status
- [ ] Cloudflare: sjekk Workers analytics

## Varsling
- **Health:** Hvert 5. min via cron `a1053a4c624b`
- **SSL + Binance:** Hver 24t via cron `963213db9aca`
- **Deploy-feil:** GitHub Actions sender email
