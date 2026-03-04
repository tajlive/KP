## KIMI FONT-BEVISRAPPORT — 2026-02-23

### Diagnostikk (Steg 1 + 2)

**Font-referanser funnet:**
- globals.css: @font-face med gammel v4 URL (linje 258-264)
- tailwind.config.mjs: fontFamily sans/display med DM Sans/Instrument Serif
- layout.tsx: Ingen next/font import (før fix)

**HTTP-kode for gammel URL:**
```
https://fonts.gstatic.com/s/instrumentserif/v4/... → 404 (bekreftet bug)
```

**Gyldige nye URL-er fra Google Fonts API:**
```
https://fonts.gstatic.com/s/instrumentserif/v5/jizHRFtNs2ka5fXjeivQ4LroWlx-6zAjgn7MsNo.woff2
https://fonts.gstatic.com/s/instrumentserif/v5/jizHRFtNs2ka5fXjeivQ4LroWlx-6zAjjH7M.woff2
```

### Endringer gjort

| Fil | Hva ble fjernet | Hva ble lagt til |
|-----|----------------|-----------------|
| globals.css | @font-face { ... } (linje 254-264) | (slettet) |
| layout.tsx | (ingenting fjernet) | DM_Sans + Instrument_Serif import (module scope) |
| layout.tsx | `<html lang={locale}>` | `<html lang={locale} className="${dmSans.variable} ${instrumentSerif.variable}">` |
| layout.tsx | `<body className="font-sans...">` | `<body className="${dmSans.className} font-sans...">` |
| tailwind.config.mjs | fontFamily sans: ['"DM Sans"', ...] | fontFamily sans: ['var(--font-dm-sans)', 'DM Sans', ...] |
| tailwind.config.mjs | fontFamily display: ['"Instrument Serif"', ...] | fontFamily serif/display: ['var(--font-instrument-serif)', ...] |

### TypeScript + Build (Steg 4)
```
TypeScript exit: 0
Build: ✓ Compiled successfully
Font-filer generert: .next/static/media/*.woff2 (6 filer)
```

### Deploy (Steg 6)
- Build-ID: 30e80d3f-be1f-4e1b-8bf2-279ba634b83c
- Status: SUCCESS
- Tid: ~11 minutter

### Playwright Bevismatrise (Steg 5)

| Bevis | Forventet | Faktisk | Status |
|-------|-----------|---------|--------|
| FONT-NO-404 | 0 font 404 | 0 | ✅ |
| FONT-LOCAL | 0 gstatic.com req | 0 (alle fra egen domene) | ✅ |
| FONT-INSTRUMENT-LOADED | Instrument Serif lastet | ✅ (139717... + e6099e...) | ✅ |
| FONT-DM-SANS-LOADED | DM Sans lastet | ✅ (9cc5b3...) | ✅ |
| FONT-NO-CONSOLE-ERROR | 0 feil | 0 | ✅ |

### Font-filer i produksjon
```
https://www.klarpakke.no/_next/static/media/9cc5b37ab1350db7...  (DM Sans)
https://www.klarpakke.no/_next/static/media/13971731025ec697... (Instrument Serif)
https://www.klarpakke.no/_next/static/media/e6099e249fd938cc... (Instrument Serif italic)
```

### Konklusjon

✅ FONT 100% FIKSET

Alle Playwright-bevis grønne.
- Null 404 på font-filer
- Null forespørsler til gstatic.com (fonter servert lokalt fra egen domene)
- Null preload-advarsel
- Null console errors
- Instrument Serif og DM Sans lastet korrekt
- Auth fortsatt 100% operativ (location: https://www.klarpakke.no/...)

klarpakke.no har nå null font-feil i konsollen.
