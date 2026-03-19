# PR-mal — KLA-91 Strategy Marketplace

Lim inn i GitHub Pull Request-beskrivelse (eller bruk som Cursor / Composer-prompt).

## Tittel

`feat(marketplace): <kort beskrivelse>`

## Sjekkliste

- [ ] `marketplace_listings` / `marketplace_subscriptions` i tråd med RLS
- [ ] Zod på alle nye API-body
- [ ] Typer fra `@/types/supabase-generated` (eller DTO + eksplisitt mapping)
- [ ] next-intl: `no`, `en`, `th`, `zh` for nye strenger
- [ ] Lister: `Array.isArray(x) ? x : []` før `.map`
- [ ] `npm run test:ci` grønn
- [ ] Ingen hemmeligheter i klientbundle

## Dokumentasjon

- [ ] `docs/architecture/KLA-91-strategy-marketplace.md` oppdatert ved kontraktsendring

## Testplan

- **E2E:** (happy path subscribe / listing)
- **Vitest:** (Zod / mapping / helpers)

## Arkitektur-referanse

Se `docs/architecture/KLA-91-strategy-marketplace.md` og `.cursor/rules/klarpakke-chief-architect.mdc`.
