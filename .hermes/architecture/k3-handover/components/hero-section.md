# Komponent: HeroSection (ny)

> **Fil:** `src/components/landing/HeroSection.tsx` (overskriv eksisterende)
> **Erstatter:** Gammel hero med "Jeg tapte 64 000 kr"

---

**Hensikt:** Kommuniser verdiforslaget på 3 sekunder: "AI-trader + ekte resultater". Aspirerende, ikke advarende.

**Visuelt design:**
- Bakgrunn: `bg-kp-bg-primary` med radial gradient overlay (`from-brand-500/5 via-transparent to-transparent`)
- Padding: `min-h-screen pt-24 pb-12 sm:pt-32 sm:pb-16`
- Text-senter på mobil, venstrejustert på desktop (med illustrasjon til høyre)
- Max bredde: `max-w-6xl mx-auto`

**Tilstander (ingen — statisk side):**
- Default: viser alltid samme innhold. Ingen loading/error states.

**Responsiv:**
- Mobil (<768px): Heading `text-display-sm`, stablet vertikalt, full-bredde CTA
- Desktop (≥768px): Heading `text-display`, side-om-side (tekst venstre, illustrasjon/pris-ticker høyre)

**Props:**
- Ingen — statisk komponent, all tekst via `useTranslations("landing")`

**Tailwind-klasser:**

```html
<section className="relative min-h-screen flex items-center bg-kp-bg-primary overflow-hidden">
  {/* Radial gradient */}
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,82,255,0.08),transparent_60%)]" aria-hidden />

  <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 w-full">
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      {/* Tekst-kolonne */}
      <div className="text-center lg:text-left space-y-6">
        <h1 className="font-display text-display-sm sm:text-display text-kp-text-primary tracking-tight">
          {t("hero.title")}
        </h1>
        <p className="text-body sm:text-body text-kp-text-secondary max-w-lg mx-auto lg:mx-0">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
          <Link href="/register" className="inline-flex items-center justify-center rounded-button bg-kp-brand px-8 py-4 text-kp-bg-primary font-bold shadow-lg shadow-kp-brand/20 hover:bg-kp-brand-dark transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            🚀 {t("hero.cta-primary")}
          </Link>
          <Link href="/jokertrade" className="inline-flex items-center justify-center rounded-button border border-kp-border px-8 py-4 text-kp-text-primary font-bold hover:bg-kp-bg-hover transition-all duration-200">
            🎭 {t("hero.cta-secondary")}
          </Link>
        </div>
        <p className="text-caption text-kp-text-muted">
          {t("hero.disclaimer")}
        </p>
      </div>

      {/* Høyre kolonne — LivePriceTicker */}
      <div className="hidden lg:flex justify-center">
        <LivePriceTicker coins={["BTCUSDT", "ETHUSDT", "SOLUSDT"]} />
      </div>
    </div>
  </div>
</section>
```

**Noter:**
- Gammel `HeroSection.module.css` **slettes** — all styling flyttes til Tailwind
- `font-display` = Instrument Serif (når font-lasting er på plass)
- Radial gradient bruker `brand.500` = `#0052FF` for en subtil blå glød

**Animering:**
- Heading: `animate-fade-up` (0.5s, hele heading-blokken kommer opp fra bunnen)
- Subheading: `animate-fade-in` (0.3s delay, 0.3s varighet) — følger etter heading
- CTA-knapper: `animate-fade-up` med 0.2s stagger mellom primær og sekundær
- Radial gradient: `animate-pulse-soft` (2s) — gir en levende bakgrunn uten å distrahere
- LivePriceTicker (i hero): tall animeres med CSS transition på color/opacity ved prisendring, 300ms ease-out
