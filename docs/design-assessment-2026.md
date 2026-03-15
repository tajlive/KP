# Designvurdering 2026 – Klarpakke fintech

## Kort svar: **Ja, godt nok – med noen forbedringer**

Designet er solid for en fintech-plattform i 2026: mørkt tema, tydelig hierarki, responsivt og med fornuftig typografi. For å oppleves som **ledende** fintech (Firi, Revolut, Wise-nivå) bør noen ting strammes inn.

---

## Hva som fungerer godt

- **Typografi**: Fraunces (display) + Lexend (body) – ikke generisk Inter/Roboto. Lexend er lesbar og brukes konsekvent i footer/layout.
- **Mørkt tema**: Konsistent bruk av slate-950, #0F1118, mørke kort – passer fintech og reduserer belastning.
- **Design-tokens**: `src/lib/design/tokens.ts` med BRAND, RADIUS, SHADOW, CARD – god base for konsistens.
- **Landing**: Tydelig hero med badge, gradient, CTA-hierarki; nav med backdrop-blur og fast header.
- **Priser**: Mørke kort, tydelig «mest populær», border-hierarki, god lesbarhet.
- **Ytelse**: LCP-optimalisert hero (ingen blokkering av animasjoner), deferred loading av underfold.

---

## Svakheter / forbedringspotensial

### 1. Hero-gradienten er veldig vanlig

- **Nå**: `from-blue-600 via-indigo-600 to-emerald-700` – samme blå/lilla/grønn-stil som mange SaaS-/AI-sider.
- **Forslag**: Én sterk merke-farge (f.eks. #0052FF) med nøktern gradient eller subtil mesh; eller mer nordisk/minimal med hvite/lysere accenter på mørk bakgrunn.

### 2. Priser: emojis som tier-ikoner

- **Nå**: 🎓 📈 🏆 🎯 (og Crown for professor) – føles uformelt for fintech.
- **Forslag**: Erstatt med enkle Lucide-ikoner (GraduationCap, TrendingUp, Award, Target) eller små illustrasjoner for mer «premium»-følelse.

### 3. Fargebruk ikke overalt via tokens

- **Nå**: Både Tailwind (slate-950, blue-600) og hardkodede hex (#0F1118, #0052FF, #2A2D3A) – tokens brukes ikke overalt.
- **Forslag**: Bruk `tokens.ts` og ev. CSS-variabler fra `globals.css` overalt (landing, priser, dashboard), så endringer skjer på ett sted.

### 4. Tabeller og datavisning

- **Nå**: Funksjonelle tabeller (admin, dashboard) med god nok spacing.
- **Forslag**: `tabular-nums` på alle tall; tydelig hover på rader; ev. subtil zebra eller border mellom rader for bedre skannbarhet.

### 5. Mikro-interaksjoner og dybde

- **Nå**: Hover scale/skygge på knapper og noe backdrop-blur i nav.
- **Forslag**: Konsistent «glass»-nivå (f.eks. kort med `bg-white/5` + border + blur) og enkle, korte overganger (200–300 ms) på interaktive elementer.

---

## Anbefalt prioritering

| Prioritet | Tiltak | Effekt |
|-----------|--------|--------|
| Høy | Erstatt emoji-ikoner på priser med Lucide-ikoner | Mer profesjonell, fintech-klang |
| Høy | Én hero-variant med merke-farge (#0052FF) og mindre «AI-gradient» | Mer særegent uttrykk |
| Medium | Bruk design-tokens konsekvent (farger, skygger) | Enklere vedlikehold og konsistens |
| Medium | Tabell-forbedringer (tabular-nums, row hover) | Bedre lesbarhet på data |
| Lav | Systematisert glass/skygge-nivå på kort | Mer moderne dybde og hierarki |

---

## Konklusjon

Designet er **bra nok for en 2026 fintech-side** i dag: troverdig, lesbart og teknisk solid. For å oppleves som **tydelig ledende** bør du prioritere: (1) fjerne emojis på priser, (2) gjøre hero mer merke-spesifikk, og (3) bruke design-tokens konsekvent. Resten kan komme inkrementelt.
