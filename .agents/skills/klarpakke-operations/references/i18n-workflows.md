# I18N Workflows

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

> ⚠️ **Eierskap:** i18n-pitfalls (nøkkel-mismatch, rå nøkkelnavn i UI) eies av `klarpakke-frontend-pitfalls/references/i18n-pitfalls.md`. Denne filen dekker den operative VALIDERINGS-workflowen (npm run i18n:validate/usage, batch-fix, ny-namespace-oppskrift).


## 1. i18n — Fullstendig valideringsworkflow

**To valideringsscript (begge må passere):**

```bash
npm run i18n:validate    # Sjekker no.json ↔ en.json struktur
npm run i18n:usage       # Sjekker kode t("key") ↔ no.json innhold
```

**`validate-i18n-usage.js` (ny 2026-07-21):**
Scanner alle `.tsx`/`.ts`-filer for `useTranslations("ns")` + `t("key")`-kall. Resolver namespace, bygger full path (`ns.key`), og sjekker at den finnes i `messages/no.json`. Rapporterer alle manglende nøkler gruppert per namespace.

**Begrensninger:**
- Fanger IKKE template literals (`t(`key.${var}`)`)
- Fanger IKKE `useTranslations()` uten argument (bruker default namespace)
- Fanger IKKE `getTranslations()` (server-side)
- Regex-basert — kan ha false positives (f.eks. SQL column names som matcher `t("...")`)

**Batch-fix ved 100+ manglende nøkler:**
```bash
python3 scripts/batch-fix-i18n.py --dry-run  # Forhåndsvis
python3 scripts/batch-fix-i18n.py            # Kjør
node scripts/validate-i18n-usage.js          # Edge-cases
npm run i18n:validate                        # Synk
```

**Begrensning:** Batch-fix fanger ikke template literals (`t(\`key.\\${var}\`)`) eller namespace-nesting-kollisjoner. Etter batch-fix, kjør ALLTID `validate-i18n-usage.js` for å fange resterende. Forvent 3-5 iterasjoner: hver gang du legger til keys, kan nye mangle pga ulik namespace-nesting i koden vs messages. Kjør `validate-i18n-usage.js` → legg til → valider → repeat til 0 gjenstår.

**Når du legger til ny `t("key")` i en komponent — gjør ALLTID samtidig:**
1. Legg til nøkkelen i `messages/no.json`
2. Legg til nøkkelen i `messages/en.json` — **med faktisk engelsk verdi, ikke kopi av den norske strengen** (gjentatt fallgruve: `tradeHistory.positions*` og `dashboard/settings/tradingResults/BotWizard` ble committet med norsk tekst i en.json — paritetsvalidatoren fanger det IKKE, den sjekker bare nøkkelstruktur)
3. Kjør språkskanningen fra §10 (identisk-verdi-passet) — skal gi 0 nye treff
4. `npm run i18n:validate && npm run i18n:usage`
5. `npm run lint`
6. Deploy

**Nytt namespace — oppskrift for ny side:**
Når en ny side bruker `getTranslations({ locale, namespace: "nyttNavn" })` og `"nyttNavn"` ikke finnes i messages-filene:

1. **Skann komponenten** for alle `t("key")`-kall — gå systematisk gjennom komponenten og noter hver translationsnøkkel med full sti (f.eks. `hero.title`, `story.p1`, `values.education.title`)
2. **Finn referanseinnhold** i eksisterende gamle namespaces (f.eks. `aboutUs` inneholder historie, sitater, filosofi som kan gjenbrukes i det nye `about`-navnerommet)
3. **Bygg hele namespace-objektet** med alle seksjoner før du rører noen fil — da ser du alle nøkler på én gang og unngår inkonsistenser
4. **Patch begge filer samtidig** — bruk `patch()` med erstatning av nøkkelordet som kommer rett etter `{` (f.eks. `"aboutUs": {` → nytt namespace + `,\n  "aboutUs": {`) for å sette inn det nye navnerommet før det gamle
5. **Verifiser strukturell ekvivalens** — NO og EN må ha identiske nøkler (samme nøsting, ingen ekstra/manglende keys). Bruk Python:
   ```python
   def same_keys(x, y):
       if isinstance(x, dict):
           return isinstance(y, dict) and set(x.keys()) == set(y.keys()) and all(same_keys(x[k], y[k]) for k in x)
       return isinstance(y, str)
   assert same_keys(no['about'], en['about'])
   ```
6. Kjør `npm run i18n:validate && npm run lint && npm run type-check` — **hopp over full `npm run build`** når endringen er JSON-only, da Next.js-kompilering tar >600s. Bygg-timeout er ikke en regresjon på JSON-endringer.
7. `npm run type-check` må passere (0 feil) — bekrefter at komponentens namespace-referanse er gyldig

**Fallgruver:**
- `getTranslations()` (server-side) vs `useTranslations()` (client-side) bruker samme namespace-struktur, men skannes av ulike validatorer. `validate-i18n-usage.js` fanger IKKE `getTranslations()` — stol på `i18n:validate` som paritetsgate for server-komponenter
- Eksisterende gammelt namespace (f.eks. `aboutUs`) kan leve videre ved siden av det nye — `i18n:validate` godtar dette, men slett gamle nøkler når de ikke lenger refereres fra noen komponent
- Aktive språk (NO, EN) må være synkrone. Deaktiverte språk (TH, ZH) kan ha mange manglende nøkler — `i18n:validate` gir grønt for aktive språk alene

### Runtime-symptomer validatorene IKKE fanger (2026-07-24)

Begge scriptene kan være grønne mens prod viser ødelagt tekst:

1. **Rå UPPERCASE-nøkkel i UI** (f.eks. `TRADINGRESULTS.WORSTDAY`): nøkkelen FINNES
   i messages, men komponenten kaller `t()` uten riktig undernavnerom-prefix
   (`t("worstDay")` når nøkkelen ligger under `kpi.worstDay`). Fallback-renderer
   viser da `NAVNEROM.NØKKEL` i caps. Fiks: kall med full sti eller flytt nøkkelen.
   Kjente tilfeller var komponenter som bruker `charts.*`-stier — sjekk kallstedets
   namespace + prefix mot faktisk JSON-struktur.
2. **Nøkkel finnes, men verdien mangler placeholder**: `t("lastUpdated", { time })`
   med verdi `"Sist oppdatert"` (uten `{time}`) → label vises, verdien er tom.
   Validatorene sjekker nøkkelparitet, IKKE at ICU-placeholdere i kallet matcher
   verdien. Symptom: label med blank verdi etter seg. Fiks: legg `{param}` inn i verdien.

Begge ble funnet visuelt på /dashboard/resultater — mobilskjermbilder under
side-turen er det eneste som fanget dem.

### i18n-arkitektur (viktig kontekst, 2026-08-03)

- **Kun `no` og `en` er AKTIVE locales** (`src/i18n/routing.config.ts` — `locales: ["no", "en"]`). `zh`/`th` er deaktivert per produktkrav, men oppgaver kan likevel kreve dem komplette.
- **`src/i18n.ts` deep-merger `no.json` (base) med locale-fila** → manglende nøkler i en/zh faller STILLE tilbake til norsk i UI. Det er derfor «alle nøkler til stede» betyr noe, ikke bare for aktive språk.
- **Validator-dekning:** `validate-i18n.js`/`i18n:validate` sjekker KUN `no/en/th` — **ikke zh**! `scripts/verify-i18n-completeness.ts` (2026-08-03) sjekker `no` → `en` + `zh` med dot-notation, exit 0/1:
  ```bash
  npx tsx scripts/verify-i18n-completeness.ts
  ```
- **Nøkkel på FEIL nestenivå telles som manglende:** en.json hadde `pilotTradeTitle` på TOPP-nivå mens no.json har den under `dashboard.adaptive.pilotTradeTitle` → «3 manglende nøkler» selv om teksten fantes. Sjekk alltid full dot-notation-sti, ikke bare nøkkelnavn.
- **Python/JS-felle:** `k in dict` sjekker KUN top-level nøkler — for dot-notation-sammenligning må man bruke en `getAt(obj, "a.b.c")`-hjelper (traff to ganger i 2026-08-03-sesjonen).

### Gap-fill-oversettelse av deaktiverte språk (3248 nøkler på én gang)

Når et språk ligger mange tusen nøkler bak (zh.json var 1439/4550): ikke håndoversett — maskinoversett i batch med placeholder-beskyttelse. Komplett oppskrift (free Google-endepunkt, ASCII-sentinels for ICU, kilde fra en.json ikke no.json, array→objekt-normalisering, type-konsistenssjekk) i `references/i18n-gapfill-oversettelse.md`. Scriptet som ble brukt: `/tmp/translate-zh.mjs` (engangs-hjelper, ikke committet).


