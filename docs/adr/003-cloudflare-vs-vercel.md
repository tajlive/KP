# ADR-003: Cloudflare over Vercel

**Status:** Accepted  
**Dato:** 2026-01-25  
**Beslutningstaker:** Taj + KIMI Code

## Kontekst

Vi trengte hosting for Next.js applikasjonen.

## Vurdering

**Alternativer:**
1. Cloudflare Pages
2. Vercel
3. Netlify
4. AWS Amplify Hosting

**Kriterier:**
- Next.js support
- Cost
- Performance (CDN)
- DDoS protection
- Analytics

## Beslutning

Vi valgte **Cloudflare Pages**.

### Fordeler

- ✅ **Gratis tier:** Ubegrenset bandwidth
- ✅ **Global CDN:** 300+ edge locations
- ✅ **DDoS protection:** Innebygd
- ✅ **Next.js support:** Via OpenNext
- ✅ **Analytics:** Real-time insights

### Ulemper

- Mindre Next.js-spesifikk enn Vercel
- Krever OpenNext adapter
- Færre built-in features

## Konsekvenser

**Positive:**
- Kostnadsfri hosting
- Lynrask global distribusjon
- Robust sikkerhet
- Lett å konfigurere

**Negative:**
- Må bruke OpenNext for full Next.js support
- Mindre seamless enn Vercel for Next.js

## Alternativer Vurdert

**Vercel:**
- Pro: Best Next.js support (laget av Next.js team)
- Pro: Zero-config deploy
- Con: Dyrere for produksjon (bandwidth limits)
- Con: Mindre robust CDN

**Netlify:**
- Pro: Godt rykte
- Con: Mindre optimalisert for Next.js

## Revidering

Denne beslutningen skal revurderes hvis:
- Cloudflare dropper Next.js-support
- Kostnadsstruktur endres
- Vercel blir betydelig bedre/cheaper

## Referanser

- https://pages.cloudflare.com/
- https://vercel.com/
