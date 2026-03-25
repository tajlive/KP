# Full Automasjon Operating Standard (2026-03)

Dette dokumentet ligger ved siden av eksisterende playbooks og er operativ standard for:

- MCP + CLI + API + SQL/PSQL + JWT/secret-baserte kall
- sikker batch-kjoring i prod-naer flyt
- Linear reset og sporbarhet

## 0) AI-hovedarkitekt (Cursor Desktop)

- **Cursor Desktop er hovedarkitekt** for prosjektet og orkestrerer **agenter + MCP** for å optimalisere leveransen (kode, sikkerhet, drift, QA, dokumentasjon) etter denne standarden.

## 1) Batch-rekkefolge (obligatorisk)

1. **Preflight**
   - `npm run automation:check`
   - `npm run auto:preflight`
2. **Kvalitetsporter**
   - `npm run lint`
   - `npm run type-check`
   - `npm run test:unit`
3. **Kritiske brukerflyter**
   - `npm run test:e2e:prepare`
   - `npm run test:e2e:critical:with-user`
4. **Deploy/verifisering**
   - `npm run verify`
   - `curl -s https://www.klarpakke.no/api/health`

## 2) Exchange og wallet-standard

- All exchange-tilkobling skjer via `exchange_connections`.
- API-secret skal kun lagres kryptert server-side.
- Kraken holdes read-only i MVP+ (saldo + tradehistorikk), ingen trading-write.
- Wallet-sannhet hentes fra synk mot exchange og skrives til `wallets` med RLS.

## 3) Sikkerhetskrav

- Ingen secret i klientkode eller URL.
- Ingen `service_role` fra klient.
- Alle DB-endringer via migrasjoner.
- Ved cron-internkall brukes `CRON_SECRET` bearer, ikke custom usignert payload.
- Exchange secrets krypteres med `EXCHANGE_ENCRYPTION_SECRET` (må settes i Vercel + lokalt).

## 4) Linear reset-standard (A)

- Prosjekter: sett status til `Completed` (bevarer historikk).
- Apne issues: sett status til `Canceled` eller `Done` etter avtalt policy.
- Etter reset: ta ut en kort statusrapport med antall lukkede saker.

## 5) Operativ loggmal

- **Scope:** hva ble endret
- **Batch:** hvilken gate/batch
- **Bevis:** kommando + resultat
- **Risiko:** kjent rest-risiko / manuell oppfolging
- **Neste:** konkret neste batch
