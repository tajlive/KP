# i18n gap-fill-oversettelse — komplett oppskrift (2026-08-03)

Brukt på: `zh.json` var 1439/4550 nøkler (3248 manglet). En kjøring fylte alle,
ingen commit-tilbakeslag, pre-commit-gates grønne.

## Arkitektur som må være kjent

- `src/i18n.ts` deep-merger `messages/no.json` (base) med `messages/<locale>.json`.
  Manglende nøkler i locale-fila faller derfor STILLE tilbake til norsk — ingen
  crash, ingen logg. «Alle nøkler til stede» er en kvalitetsgate, ikke en krasjgate.
- Kun `no`/`en` er aktive locales (`src/i18n/routing.config.ts`). `zh`/`th` er
  deaktivert, men kan likevel kreves komplette av oppgaver/planer.
- `validate-i18n.js` (`npm run i18n:validate`) dekker KUN `no/en/th` — dekker
  IKKE `zh`. Bruk `npx tsx scripts/verify-i18n-completeness.ts` for full dekning
  (no → en + zh, exit 0/1).

## Steg 1 — Finn manglende nøkler (dot-notation)

```python
def extract(obj, prefix="", out=None):
    if out is None: out = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            full = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict): extract(v, full, out)
            else: out.add(full)   # arrays = leaf!
    return out
```

**Pitfall A — `k in dict` sjekker kun TOP-LEVEL.** `get_at(en, "helpPage.faqs.0.q")`
må løse dot-notation; `"helpPage.faqs.0.q" in en` er alltid False. Denne fellen
traff TO ganger i én sesjon. Bruk alltid en `get_at`-hjelper.

**Pitfall B — nøkkel på feil nestenivå telles som manglende.** en.json hadde
`pilotTradeTitle` som TOPP-nivå-nøkkel mens no.json har
`dashboard.adaptive.pilotTradeTitle`. Scriptet rapporterer «manglende» — sjekk
om teksten finnes et annet sted i fila før du oversetter.

## Steg 2 — Kildespråk: bruk en.json (English), IKKE no.json

Testet: norsk → kinesisk via Google gir søppel (`"Maks {limit} valutaer for
{tier}-nivå"` → `"对 {tier}-nivå 进行 {limit} 评估"` — «valutaer» forsvant).
Engelsk → kinesisk er god. Siden en.json nesten alltid er komplett, kilde fra
en.json og fallback til no.json bare for de få som mangler der.

## Steg 3 — Maskinoversettelse med placeholder-beskyttelse

**Endepunkt (gratis, ingen nøkkel):**
```
GET https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=<tekst>
```
- Batch: join ~50 strenger med `\n`, svar splittes tilbake på `\n`.
  → **Pitfall C:** strenger med innebygde newlines må sentineliseres FØR batching.
- Rate-limit: sleep ~180 ms mellom requests, retry med backoff på 429/5xx.
- ~3240 strenger = ~65 requests ≈ 3 min. Kjør som eget script (engangs-hjelper
  i `/tmp`, ikke committet), ikke inne i samtalen.

**Sentinel-teknikk (verifisert):**
- PUA-tegn (`\ue000{i}\ue001`) blir ØDELAGT/reordret av Google — ikke bruk.
- ASCII-sentinel `ZQX7H{i}ZQ` passerer 100 % intakt, SELV når Google omstrukturerer
  setningen. Gjenopprett ved IDENTITET (søk+erstatt hver sentinel), ikke posisjon —
  Google reorderer fritt (eks.: `"Max {limit} coins for {tier}"` → `"{tier} 等级的最大 {limit} 硬币"`).
- Sentineliser ICU-tokens `{...}` (brace-matching-scanner med nestingsdybde) +
  `{{var}}` + innebygde newlines. Restore etterpå, verifiser at ALLE tokens finnes
  i resultatet; ved tap → beholde kildeverdien (ikke committe manglende placeholder).
- Kompleks ICU (`{count, plural, =1 {...} other {...}}`): Google oversetter hele
  konstruksjonen korrekt inkl. inner-literals — men håndskriv de få (6 stk) for
  kontroll. **Pitfall D:** detektoren må være `\{\s*\w+\s*,\s*(plural|select)\s*,`
  — naiv `/plural|select/` matcher vanlige engelske ord («Tap a strategy to select»).

## Steg 4 — Merge som IKKE rører eksisterende oversettelser

- Start fra eksisterende locale-fil, `setAt`-sett KUN manglende nøkler.
- **Pitfall E — array vs objekt:** zh hadde `helpPage.faqs` som ARRAY mens no.json
  har objekt med nøkkel-`"0".."5"`. `extractKeys` behandler arrays som leaf →
  mismatch er usynlig for nøkkelsammenligning og `setAt` skriver inn i arrayet.
  Normaliser: konverter arrays til index-keyed-objekter der no.json har dict
  på samme sti, FØR merge.
- **Pitfall F — «tapte» nøkler i diff:** etter merge, diff key-sett gammel vs ny.
  Hvis noen gamle nøkler forsvant: sjekk om de var STRING-verdier der no.json har
  OBJEKT (`admin.system` var `"系统"`, `trading.positions` var `"Posisjoner"`).
  Da er «tapet» en type-fiks (latent bug: next-intl ville krasjet/rendret feil).
  Duplikate keys i gammel JSON kollapser også på parse (siste vinner) — ser ut
  som slettinger i diff, men er opprydding.

## Steg 5 — Verifiser FØR commit

1. `npx tsx scripts/verify-i18n-completeness.ts` → exit 0
2. **Type-konsistens:** for HVER sti i no.json må zh-verdien ha samme
   container/leaf-type (`isinstance(v, dict) == isinstance(zv, dict)`), og arrays
   må være arrays. Gammel zh hadde 0 type-mismatch etter fiks.
3. `node scripts/validate-i18n.js` → exit 0 (en er kritisk)
4. Spot-sjekk oversettelser + placeholder-integritet på stikkprøver
5. `git add` KUN de relevante filene (worktree har ofte urelaterte dirty-filer —
   ikke `git add -A`)
6. Pre-commit-hooken kjører AST/tsc/i18n-gates automatisk — verifiser at de
   passerer (steg 5d dekker kun no/en/th, så kjør verify-scriptet manuelt for zh)
