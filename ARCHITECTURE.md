# Klarpakke Architecture

## Routing

- **localePrefix:** `"always"` (satt i commit `ae67544c0`, 11. april 2026)
- **Årsak:** Konsistent URL-struktur for `/no/*` og `/en/*`
- **Konsekvens:** Alle uprefixede paths redirectes `307 → /no/{path}`
- **Smoke-test:** `scripts/smoke-prod.sh` validerer dette ved hver deploy
- **defaultLocale:** `no`
- **Aktive locales:** `no`, `en`
- **localeDetection:** `false` (vi bruker ikke Accept-Language for redirect)
