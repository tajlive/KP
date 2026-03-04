# ADR-001: Next.js over Remix

**Status:** Accepted  
**Dato:** 2026-01-15  
**Beslutningstaker:** Taj + KIMI Code  

## Kontekst

Vi trengte å velge et React framework for Klarpakke Universitet.

## Vurdering

**Alternativer:**
1. Next.js 15 (App Router)
2. Remix
3. Gatsby
4. Create React App

**Kriterier:**
- Cloudflare Pages support
- SSR + SSG hybrid
- TypeScript support
- Community size
- i18n support
- AI-familiarity

## Beslutning

Vi valgte **Next.js 15 (App Router)**.

### Fordeler

- ✅ **Best Cloudflare Pages support:** Via OpenNext adapter
- ✅ **Størst community:** Mest dokumentasjon, Stack Overflow-svar
- ✅ **Excellent TypeScript:** Built-in, ingen ekstra config
- ✅ **App Router matcher i18n:** `[locale]` dynamic segments
- ✅ **Solid ecosystem:** next-intl, React Query, etc.
- ✅ **AI familiarity:** ChatGPT, KIMI, Cursor kjenner Next.js best

### Ulemper

- Kompleks caching (App Router er nytt)
- Noen Cloudflare-quirks (løst med OpenNext)
- Mindre "web standard" enn Remix

## Konsekvenser

**Positive:**
- Rask deploy til Cloudflare (3-5 min)
- Stort økosystem av plugins
- God dokumentasjon
- AI-agenter kan hjelpe effektivt

**Negative:**
- Læringskurve for App Router
- Breaking changes i Next.js kan påvirke

## Alternativer Vurdert

**Remix:**
- Pro: Mer "web standard" (native FormData, etc.)
- Con: Mindre community, færre plugins
- Con: Cloudflare Pages support mindre moden

**Gatsby:**
- Pro: Utmerket for statiske sider
- Con: SSR support begrenset
- Con: Overkill for app med dynamic content

## Revidering

Denne beslutningen skal revurderes hvis:
- Cloudflare dropper Next.js-support
- Remix får betydelig bedre Cloudflare-integrasjon
- Next.js App Router blir ustabilt

## Referanser

- https://nextjs.org/
- https://opennextjs.org/cloudflare
