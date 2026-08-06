# Prod E2E-gotchas (2026-08-03) — all-pages + Lighthouse + i18n-completeness

Tre fallgruver fra byggingen av `e2e/smoke/all-pages.spec.ts`, `e2e/smoke/lighthouse.spec.ts` og `scripts/verify-i18n-completeness.ts`. Se også SKILL.md sin «Falske positiver»-seksjon (innerText-regel, U+00A0, storageState-overstyring).

## 1. Krasj-indikator-grep treffer legitime tall

`all-pages.spec.ts` grep'et etter `text=500` på landingssiden og fant **"5000 KLT"** → falsk krasj-alarm (1 failed).

**Regel:** krasj-indikatorer må være spesifikke nok til å unngå treff i markedsføringstall:

```ts
const CRASH_INDICATORS = [
  "Application error",
  "Internal Server Error",
  "500 Internal Server Error",  // IKKE bare "500"
  "404 Not Found",              // IKKE bare "404"
  "This page could not be found",
  "Something went wrong",
  "client-side exception",
];
```

Substring-grep på norske sider med store tall (100 000 kr, 5000 KLT) treffer alltid noe.

## 2. Lighthouse i Playwright med workers: 2 → score-varians ±15 poeng

`playwright.config.ts` har `workers: 2`. To Lighthouse-audits parallelt deler CPU → Landing scoret 79 (fail mot terskel 80) og 94 på samme kode, minutter fra hverandre.

**Fiks:** kjør Lighthouse-tester med `--workers=1`, eller sett terskel med margin. Terskler som holder i prod (2026-08-03):

| Kategori | Terskel | Observert |
|---|---|---|
| performance | ≥ 75 | 82–99 |
| accessibility | ≥ 88 | 89–96 |
| best-practices | ≥ 85 | 100 |
| seo | ≥ 90 | 92 |

Timeout: `test.setTimeout(120000)` per side — Lighthouse tar 30–60 s per audit mot prod.

## 3. i18n-kompletthet på tvers av ALLE språk

`i18n:validate` sjekker NO/EN-synk, men IKKE at zh (eller fremtidige språk) har samme nøkkelsett som no.json. `scripts/verify-i18n-completeness.ts`:

1. Laster `messages/no.json` (base, ~4550 nøkler)
2. Ekstraherer nøkler rekursivt (dot-notation: `dashboard.adaptive.pilotTradeTitle`)
3. Diff'er mot `en.json` og `zh.json`
4. Ekstra nøkler i andre språk = OK (ignoreres); manglende = exit 1 med liste

Kjør: `npx tsx scripts/verify-i18n-completeness.ts`. Bruk ved nye språk eller etter større i18n-endringer (rename-bølger, nye features).
