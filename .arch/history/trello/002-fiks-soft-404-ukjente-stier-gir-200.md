# Fiks soft-404 (ukjente stier gir 200)

- **Trello:** kort #2 · liste «✅ Verifisert» · opprettet 2026-08-08
- **Kilde:** https://trello.com/c/6a77a7ce (board 6a77a7ac73020977260a3931)
- **Klassifisering:** Gruppe B — dokumentasjon (ikke flyttet til Linear)

## Innhold

Diagnose: /Users/taj/Documents/kimi/workspace/soft-404-fiks.md
Alle tilfeldige stier under /[locale]/ gir 200 med 366KB HTML. notFound() kalles korrekt, men status dør i OpenNext/Cloudflare-adapteren.

Steg A: test ny adapter-build. Steg B: eksplisitt 404-route + redirect().

Akseptanse: curl -s -o /dev/null -w '%{http_code}' https://www.klarpakke.no/no/dette-finnes-ikke-12345 → 404
