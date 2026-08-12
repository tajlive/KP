# OKX som sekundær datakilde i appen

- **Trello:** kort #11 · liste «📋 Funnet automatisk» · opprettet 2026-08-09
- **Kilde:** https://trello.com/c/6a77c9b0 (board 6a77a7ac73020977260a3931)
- **Klassifisering:** Gruppe B — dokumentasjon (ikke flyttet til Linear)

## Innhold

OKX-nøkler verifisert og lagret i Bitwarden (OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE, OKX_HOST=eea.okx.com). Konto: OKX Europe (MiCA).

Oppgave: legg til OKXMarketDataProvider (samme mønster som BinanceMarketDataProvider m/ CoinGecko-fallback). Public endpoints holder for priser: eea.okx.com/api/v5/market/ticker?instId=BTC-USDT.

Kimi har allerede prisavviks-vakt kjørende (Kraken vs OKX, 30 min, alarm ved >1.5%).

Ikke rør execution — kun datakilde.
