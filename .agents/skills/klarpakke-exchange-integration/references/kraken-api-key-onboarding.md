# Kraken API-nøkkel onboarding-sjekkliste (2026-08-05)

Utledet fra Toms onboarding der withdraw/earn var slått PÅ som default, og `user_kraken_keys` viste seg å være tom ved første live-forsøk.

## Før «klart for live» erklæres

```sql
SELECT COUNT(*) FROM user_kraken_keys WHERE is_active;
```

= 0 → ingen kan trade, uansett hvor grønne rutene er. Kill-switch-drill mot 0 brukere avslører dette umiddelbart — kjør alltid drilla og les `usersAffected`.

## Kraken UI — tillatelser (Settings → API)

PÅ: Query Funds, Query Open Orders & Trades, Query Closed Orders & Trades, Modify Orders, Cancel/Close Orders, Query Ledger, Deposit Query (for deposit-poll).

AV (kritisk):
- **Withdraw (Ta ut)** — ALLTID AV. Begrunnelse å gi brukeren: lekket nøkkel kan verst tenkelig trade dårlig, men aldri flytte penger ut av Kraken. Ingen kill switch stopper et uttak som allerede er sendt.
- **Earn/Staking (Tjen)** — grid står for inntjeningen; unødvendig flate.

## Innstillinger under tillatelsene

| Innstilling | Verdi | Hvorfor |
|---|---|---|
| Egendefinert nonce-vindu | **PÅ, verdi 10** | Klienten bruker Date.now()-nonce med retries; parallele kall gir «Invalid nonce» uten vindu. Klassisk Kraken-felle. |
| IP-begrensning | AV | Cloudflare Workers har dynamiske IP-er — med denne PÅ dør alt (samme felle som Binance TRD_GRP_031). |
| WebSocket | AV (til det brukes) | REST only ennå — unødvendig åpning. |
| Utløpsdato | AV | Nøkkelen skal leve; utløp stopper trading brått. |
| Start-/sluttdato for spørring | AV | Vi trenger full historikk (trades, deposits). |

## Deposit-metode-råd (EEA/Norge, verifiserte gebyrer 2026)

- SEPA / SEPA Instant: gratis, 0–3 dager / umiddelbart — førstevalg.
- Debetkort: 0.25 EUR + 3.75%, min 10 EUR, nesten umiddelbart.
- USDT er ikke alltid kjøpbart direkte med kort — **USDC er det**, og auto-convert har USDC→USDT-sti (marketSell på USDCUSDT, ordremin 5).
- IKKE kjøp crypto i tredjepart (Revolut) og flytt: to gebyr-ledd + min-uttak + ingen test av fiat-flyten.
