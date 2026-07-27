# Komponent: ModeSelector (TradingModesExplainer v2)

> **Fil:** `src/components/landing/TradingModesExplainer.tsx` (overskriv)

---

**Hensikt:** Tre visuelt distinkte kort som umiddelbart kommuniserer forskjellen på Manuell, Auto og JokerTrade. Én konto, tre sjåfører.

**Visuelt design:**
- Kort: `rounded-2xl border-2 p-6` med mode-spesifikk farge
- Ikon: `text-4xl` emoji sentrert øverst
- Navn: `font-bold text-white text-lg`
- Tagline: `text-sm text-kp-brand font-medium` (farget per mode)
- Beskrivelse: `text-xs text-kp-text-secondary`
- Hover: `hover:scale-[1.02] transition-all duration-200`

**Farge-tema per mode:**
| Modus | Border | Bakgrunn | Glow |
|---|---|---|---|
| Manuell | `border-emerald-500/40` | `from-emerald-950/30` | `ring-emerald-500/30` |
| Auto | `border-amber-500/40` | `from-amber-950/30` | `ring-amber-500/30` |
| JokerTrade | `border-violet-500/40` | `from-violet-950/30` | `ring-violet-500/30` |

**Tilstander:**
- Default: Viser tre kort
- Hover (per kort): scale(1.02), glow-intensiveres
- Active (trykk): scale(0.98)
- Ingen loading/empty/error — statisk

**Responsiv:**
- Mobil (<768px): 1 kolonne, full bredde
- Desktop (≥768px): 3 kolonner, lik høyde

**Props:**
- `activeMode?: "manual" | "auto" | "joker"` — uthever aktivt kort med ring
- Ingen required props — alle har fornuftige defaults

**Tailwind-klasser (JokerTrade-kort som eksempel):**

```html
<Link href="/jokertrade" className="group relative">
  <div className="relative overflow-hidden rounded-2xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-950/30 to-transparent p-6 transition-all duration-200 hover:scale-[1.02] hover:border-violet-400/60 group-active:scale-[0.98]">
    {/* Ikon */}
    <div className="text-4xl mb-3">🎭</div>
    {/* Navn + tagline */}
    <h3 className="font-bold text-white text-lg">JokerTrade</h3>
    <p className="text-sm text-violet-400 font-medium mt-1">AI gjør alt</p>
    <p className="text-xs text-kp-text-secondary mt-2">
      Trykk start — AI-en analyserer, velger og handler. Du lener deg tilbake.
    </p>
    {/* Pil ved hover */}
    <span className="absolute bottom-3 right-3 text-violet-400 opacity-0 group-hover:opacity-100 transition-all">→</span>
  </div>
</Link>
```

**Noter:**
- Dagens `TradingModesExplainer` har for mye tekst. Kutt til én setning per modus.
- Fjern "Hvem styrer/Hvor mye/Best for"-seksjonene — de er redundant med tagline.
- Behold emoji-ikoner (de er plattform-uavhengige, ingen eksterne assets)

**Animering:**
- Kort (staggered): Hvert kort `animate-fade-up` med 0.1s inkrementell delay (kort 1: 0s, kort 2: 0.1s, kort 3: 0.2s)
- Hover: `scale(1.02)` + border-glow overgang, 200ms ease-out
- Pil (hover): `opacity 0→1` + `translateX(4px→0)`, 150ms ease-out
- Aktivt modus-merke: `animate-pulse-soft` på prikken ved siden av navnet
