# Feature Template

## Prompt
```
Implementer [FEATURE] i /Users/taj/klarpakke.

## Steg
1. Undersøk eksisterende kode (kimi_grep + kimi_read)
2. Analyser arkitektur (kimi_medium)
3. Implementer endring (kimi_medium/kimi_code)
4. Kjør relevante tester (kimi_test)
5. Verifiser bygg (kimi_shell: npm run build)
6. Commit med beskrivende melding

## Output Format
A) Status: GO/NO-GO
B) Implementasjon: [hva ble gjort]
C) Tester: [status]
D) Breaking changes: [ja/nei]
E) KIMI-prompt for videre: [hvis relevant]
```

## Eksempel
```
Implementer rate limiting for /api/trading/execute i /Users/taj/klarpakke.
```
