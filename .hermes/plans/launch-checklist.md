# Lanseringssjekkliste — Klarpakke

> **Mål:** 100% fungerende produksjon med null kjente feil
> **Dato:** 2026-07-12

## ✅ PASSERT

- [x] **Nettsiden laster** — alle offentlige sider returnerer 200 + gyldig HTML
- [x] **Ingen SSR-feil** — 0 `data-dgst` på noen side
- [x] **Ingen React hydration errors** — #418 fikset (dobbelt `<html>` fjernet)
- [x] **Ingen Sentry meta foran DOCTYPE** — `tracePropagationTargets: []`
- [x] **Worker 1102** — Unbound Worker (30 min CPU)
- [x] **Worker size** — 8.47 MB / 9.5 MB (1.03 MB headroom)
- [x] **Root URL** — script-redirect til /no
- [x] **JokerTrade** — synlig i navigasjon + side laster
- [x] **Ingen hardkodede tall** — fjernet "5.2M", "15+ tradere"
- [x] **Win rate 0.71% → 71%** — formatWinRateOrDash fikset
- [x] **totalCapital 7M → 88K** — RPC fikset
- [x] **Post-deploy verifikasjon** — 6 sider sjekkes
- [x] **Pre-deploy size gate** — 9.5 MB limit
- [x] **Unit tests** — 33 tester, 2 filer
- [x] **E2E HTML struktur** — 6 parallelle tester
- [x] **Build stabilitet** — `bash --noprofile --norc` bypass
- [x] **Edge Functions deployet** — paper-trading-init, progress, trading-analytics
- [x] **Supabase MCP** — konfigurert (krever OAuth restart)

## 🟡 MINDRE — kan leve med

- [ ] **Root URL SEO** — script-redirect, ikke middleware (OpenNext CF begrensning)
- [ ] **Worker margin** — 1.03 MB, snau ved neste feature
- [ ] **Build time** — 5-7 min per deploy
- [ ] **API-ruter** — 172 i ett worker (burde splittes over tid)
- [ ] **Hengende sesjoner** — 2 stk identifisert, pg_cron håndterer

## 🔴 MÅ FIXES FØR LANSERING — ingen

---

**Sjekk utført av:** Hermes Agent (Lead Architect)
