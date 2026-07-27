# Side: Hjemmeside (`/`)

> **Fil:** `src/app/[locale]/page.tsx`
> **Komponenter:** HeroSection, TradingModesExplainer, SocialProof, LivePriceTicker

---

## Wireframe

```
┌──────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────┐  │
│  │              HERO (viewport-høyde)                  │  │
│  │                                                    │  │
│  │  Din personlige AI-trader.                         │  │
│  │  Skaffet opptil +343% for våre beste brukere.*     │  │
│  │                                                    │  │
│  │  ₿ $65 446  ⟠ $1 970  ◎ $77 01  ← Live priser     │  │
│  │                                                    │  │
│  │  [🚀 Start gratis]  [🎭 Se JokerTrade]              │  │
│  │                                                    │  │
│  │  *Basert på ekte papirhandel-resultater.           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │           HVORDAN FUNGERER DET?                     │  │
│  │                                                    │  │
│  │   1. Koble til    2. AI analyserer  3. Tjen penger │  │
│  │   Binance eller    12 agenter        AI handler,    │  │
│  │   paper-konto      stemmer           du tjener      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 🖐️       │  │ 🤖       │  │ 🎭       │              │
│  │ Manuell  │  │ Auto     │  │ JokerTrade│             │
│  │ Du       │  │ Du + AI  │  │ AI gjør  │              │
│  │ styrer   │  │ sammen   │  │ alt       │              │
│  │          │  │          │  │           │              │
│  │ Start →  │  │ Sett opp │  │ Prøv nå → │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              TOPP TRADERE                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │  │
│  │  │ t***@... │  │ a***@... │  │ k***@... │         │  │
│  │  │ +343%   │  │ +122%   │  │ +78.5%  │         │  │
│  │  │ 273 tr. │  │ 284 tr. │  │ 434 tr. │         │  │
│  │  │ ✅ Veri. │  │ ✅ Veri. │  │ ✅ Veri. │         │  │
│  │  └──────────┘  └──────────┘  └──────────┘         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Klar for å la AI-en jobbe for deg?                 │  │
│  │  [🚀 Start gratis med 100 000 kr i lekepenger]      │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Komponent-tre

```
page.tsx
├── HeroSection (viewport-høyde)
│   ├── Heading (display, 3 ord maks)
│   ├── Subheading (body, 15 ord maks)
│   ├── LivePriceTicker (3 coins: BTC, ETH, SOL)
│   ├── CTA-Primary ("Start gratis")
│   └── CTA-Secondary ("Se JokerTrade")
├── HowItWorks (3 steg, horisontalt på desktop, stablet på mobil)
│   ├── Step 1: "Koble til Binance eller start med paper-konto"
│   ├── Step 2: "12 AI-agenter analyserer markedet 24/7"
│   └── Step 3: "AI-en handler — du følger med på resultatene"
├── TradingModesExplainer (3 mode-kort)
│   ├── ModeCard: Manuell (emerald)
│   ├── ModeCard: Auto (amber)
│   └── ModeCard: JokerTrade (violet)
├── SocialProof (topp 3 leaderboard)
│   └── TraderCard ×3
└── CTAFooter
    └── CTA-Primary ("Start gratis")
```

---

## i18n-nøkler (no.json)

```json
{
  "landing": {
    "hero": {
      "title": "Din personlige AI-trader.",
      "subtitle": "Skaffet opptil +343% for våre beste brukere.",
      "disclaimer": "Basert på ekte papirhandel-resultater. Historisk avkastning garanterer ikke fremtidig avkastning.",
      "cta-primary": "Start gratis",
      "cta-secondary": "Se JokerTrade"
    },
    "howItWorks": {
      "title": "Slik fungerer det",
      "step1": {
        "title": "Koble til",
        "description": "Koble Binance eller start med 100 000 kr i lekepenger — 30 sekunder."
      },
      "step2": {
        "title": "AI analyserer",
        "description": "12 AI-agenter analyserer markedet 24/7 og stemmer over hver trade."
      },
      "step3": {
        "title": "Tjen penger",
        "description": "AI-en handler automatisk. Du følger resultatene — ingen stress."
      }
    },
    "modes": {
      "title": "En konto — tre måter å trade på",
      "subtitle": "Du flytter ikke penger. Du bytter bare hvem som styrer.",
      "manual": {
        "name": "Manuell",
        "tagline": "Du bestemmer alt",
        "description": "Kjøp og selg selv. Full kontroll."
      },
      "auto": {
        "name": "Auto",
        "tagline": "Du + AI sammen",
        "description": "Sett regler. AI-en utfører."
      },
      "joker": {
        "name": "JokerTrade",
        "tagline": "AI gjør alt",
        "description": "Trykk start. AI-en ordner resten."
      }
    },
    "socialProof": {
      "title": "Topp tradere akkurat nå",
      "verifiedBadge": "Verifisert",
      "tradeCount": "{count} handler",
      "returnLabel": "avkastning"
    },
    "ctaFooter": {
      "title": "Klar for å la AI-en jobbe for deg?",
      "cta": "Start gratis med 100 000 kr i lekepenger"
    }
  }
}
```

---

## Mobil (<768px) tilpasninger

- Hero: heading → `text-display-sm` (3rem), subheading → `text-body-sm`
- Pris-ticker: horisontal scroll (overflow-x-auto), 3 coins side-om-side med kompakt padding
- HowItWorks: stablet vertikalt, nummer-sirkler til venstre
- Mode-kort: stablet, full bredde, mindre padding (p-4)
- SocialProof: horisontal scroll, 280px kort-bredde
- CTA-footer: stablet, full-bredde knapp

---

## Interaksjoner

- LivePriceTicker: tall animeres ved endring (fade + scale, 300ms)
- Mode-kort: hover → scale(1.02) + glow på border
- CTA-knapper: hover → scale(1.02), active → scale(0.98)
- SocialProof: statisk, ingen hover-effekt — data er data
