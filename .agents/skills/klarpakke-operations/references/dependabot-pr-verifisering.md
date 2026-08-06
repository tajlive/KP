# Dependabot-PR-verifisering (major-bumps) — 2026-07-25

Toms stående regel: **major-versjoner auto-merges ALDRI** — test-suiten kjøres mot dem
først, og resultatet rapporteres. Minor/patch venter til Tom sier go.

## Oppskrift — test bumpen på toppen av DAGENS main

```bash
git fetch origin                       # FØRST — stale refs gir fantom-diff
git checkout main && git pull
git checkout -b test/<pkg>-<versjon>
git merge origin/dependabot/npm_and_yarn/<pkg>-<versjon> --no-edit
npm ci
npm run test && npx tsc --noEmit       # full suite, ikke bare berørte tester
```

Rapportér per PR: suite-resultat, tsc, faktisk landet versjon, risikovurdering, anbefaling.

## Fallgruver (alle truffet denne runden)

1. **Stale refs → fantom-diff.** Uten fetch+pull viser
   `gh pr checkout N && git diff main --stat` alle PR-er merget siden
   dependabot-grenen ble kuttet — ser ut som PR-en rører 13 filer når den rører 2.
   Løsning: merge bumpen på FERSK main og diff på nytt.
2. **PR-tittelen kan lyve om versjonen.** «adm-zip 0.5 → 0.6 (MAJOR)» leverte
   0.5.18: en parent-avhengighets range blokkerte 0.6.x, så lockfile gikk til
   høyeste tillatte PATCH. Etter `npm ci`: kjør `npm ls <pkg>` og rapporter
   versjonen som FAKTISK landet — ikke tittelen.
3. **Sjekk om pakken brukes i det hele tatt.**
   `grep -rn "from '<pkg>'" src scripts` ga null treff for `uuid` (direkte-dep i
   package.json) — «major»-bump av død import = null risiko. Rapporter og foreslå
   fjerning av dep-en i egen PR i stedet for bare «tester grønne».
4. **Transitive lockfile-bumps** (pakken står ikke i package.json deps, f.eks.
   adm-zip via Sanity CLI) kan ikke knekke kodepaths utover det suiten fanger —
   kjør suiten uansett, men nevn begrenset blast radius i rapporten.
5. **Opprydding krever samtykke.** `git branch -D test/…` traff
   godkjenningsdialog som timet ut. Ikke retry, ikke omgå — la test-grenene stå
   og nevn dem; de er ufarlige.
