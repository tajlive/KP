# Mobile First

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 19. Mobile-first (80% trafikk er mobil) — `py-12 sm:py-20` mønster

**Problem:** Alle seksjoner hadde `py-20` (5rem = 80px padding top/bottom). ~80% av trafikken er mobil, og 3-4 seksjoner stablet vertikalt med 80px padding blir altfor mye whitespace.

**Regel:** HVER landing-page seksjon skal ha responsive padding — alltid mobil-først:
```tsx
className="py-12 sm:py-20 ..."
//  py-12 (3rem = 48px) på mobil
//  sm:py-20 (5rem = 80px) på desktop
```

| Seksjon | Desktop | Mobil |
|---------|---------|-------|
| FeaturesSection | `py-20` | `py-12` |
| TradingModesExplainer | `py-20` | `py-12` |
| CTASection | `py-20` | `py-12` |

Unntak: HeroSection kan ha `min-h-screen` for å fylle viewport på desktop, og la content bestemme høyden på mobil.


