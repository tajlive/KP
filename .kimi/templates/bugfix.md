# Bugfix Template

## Prompt
```
Fiks [BUG] i /Users/taj/klarpakke.

## Steg
1. Reproduser/feilsøk (kimi_shell/kimi_grep)
2. Finn rotårsak (kimi_large analyse)
3. Implementer minimal fix (kimi_medium)
4. Verifiser fix (kimi_test)
5. Sjekk for regressjoner (kimi_grep for lignende mønstre)
6. Commit med "fix: [beskrivelse]"

## Output Format
A) Status: GO/NO-GO
B) Rotårsak: [forklaring]
C) Fix: [beskrivelse]
D) Testing: [hvordan verifisert]
E) Regresjonssjekk: [ja/nei]
```

## Eksempel
```
Fiks memory leak i useTradingSession hook i /Users/taj/klarpakke.
```
