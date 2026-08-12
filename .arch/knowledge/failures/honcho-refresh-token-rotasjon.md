# Failure

System: Honcho memory (OAuth-grant, ekstern minne-backend)
Dato: 2026-08-11 → 2026-08-12 (KLA-278)

Symptom: «Honcho krasjer hele tiden» — minnet sluttet å fungere gjentatte ganger.
Automatisk token-refresh feilet, grant ble ugyldig uten forvarsel.

Rotårsak: `refresh-honcho-key`-cronen kalte OAuth-endepunktet hvert 45. minutt.
Honcho roterer refresh-tokenet ved HVERT refresh, og scriptet kastet det nye tokenet
→ Hermes' grant ble ugyldig hver eneste gang cronen kjørte.

Fix: Hermes = ENESTE refresh-klient. Ny `scripts/sync-honcho-key.mjs` er read-only
(kopierer bare apiKey til `.env.local`, ingen nettverkskall, exit 2 ved utgått).
Slettet 2 grant-roterende croner + wrapper. Ny cron `honcho-key-sync` (45 min, no_agent).

Permanent regel: Én OAuth-grant = én refresh-klient. Alle andre klienter (KIMI/.env.local)
får token via read-only sync — aldri egen refresh.

Arvet av: Klarpakke (Hermes som refresh-klient; KIMI via read-only sync).
