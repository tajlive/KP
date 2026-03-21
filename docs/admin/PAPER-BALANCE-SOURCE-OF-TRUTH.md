# Lekepenger (paper) — kanonisk modell og runbook

**Formål:** Én sannhet for hva brukere «ser» i UI vs hva som ligger i DB, og når support/admin skal endre profil vs økt.

## Kanonisk setning (SoT)

**UI-saldo for lekepenger** viser **`user_profiles.paper_balance`** (NOK). Aktive paper-økter i **`trading_sessions`** (mode = paper) kan ha egen `balance` / baseline; admin-API kan synkronisere økter mot profilen, men **kilden brukeren forventer i dashboard og handelsflyt er profilfeltet** med mindre en skjerm eksplisitt leser øktdata.

## Når skal admin bare endre profil?

- Bruker skal «starte på nytt» med ny **visnings-saldo** uten å røre historikk i økter: oppdater **`user_profiles.paper_balance`** (via admin-API eller dashboard-admin med sync av **av**).
- Rask fiks når økter er stoppet/inaktive og bare tallet på profilen er feil.

## Når skal admin nullstille / synke økt?

- Bruker har **aktiv paper-økt** og UI eller P&L henger etter fordi **`trading_sessions`** divergerer fra profilen.
- Bruk admin **lekepenger**-flyten med **«Synk aktive paper-økter»** og ev. **«Nullstill startkapital og P&L på øktene»** når øktene skal tvinges i tråd med ny profil-saldo (se hint i admin-modal).

## Etterforskning (support)

1. Les **`user_profiles.paper_balance`** for bruker-id.
2. Finn aktive paper-rader i **`trading_sessions`** (filtrer på mode/status etter produktkonvensjon).
3. Hvis tallene divergerer: kjør målrettet synk via admin-API eller dokumenter manuell SQL kun i Supabase med ekstra forsiktighet (service role / migrasjon).

## Relatert

- Admin-auth og audit: `src/lib/admin/verify-admin-access.ts`, tabell **`admin_audit_log`** (mutasjoner logges fra API).
- Prising/tier SoT: `docs/pricing/PRICING-PLAN-SOURCE-OF-TRUTH.md`.
