# Klarpakke Task Templates v2 (Engangsoppgaver)

Lim inn i Perplexity-chat (ikke i Space-prompt).

---

## Template A: Feature-implementering

```
Oppgave: [BESKRIV FEATURE]

Bruk KIMI-først:
1. Verifiser: "Bruk kimi_shell: cd /Users/taj/klarpakke && npm run verify"
2. Analyser: "Bruk kimi_medium: Analyser [område] og foreslå implementering"
3. Implementer: "Bruk kimi_medium: Implementer [spesifikt] med GO/NO-GO"

Test: Kjør relevante tester for endringen, eller "Bruk kimi_test" ved høy risiko.

Output:
- A) Status
- B) Rotårsak
- C) Beste løsning
- D) P0/P1/P2
- E) GO/NO-GO sjekk
- F) KIMI-prompt klar
```

---

## Template B: Bug-fix

```
Bug: [BESKRIV FEIL]

Repro: [HVORDAN GJENSKAPPE]

Bruk KIMI-først:
1. Undersøk: "Bruk kimi_grep: pattern=[feil]"
2. Analyser: "Bruk kimi_large: Finn rotårsak til [feil]"
3. Fix: "Bruk kimi_medium: Fiks [spesifikt]"

Test: Verifiser at fix fungerer – kjør relevante tester.

Output:
- B) Rotårsak (kritisk!)
- C) Beste løsning (minimal fix)
- D) P0 hvis prod-feil, ellers P1
- F) KIMI-prompt for fix
```

---

## Template C: Deploy

```
Deploy: [HVA] til [HVOR]

Pre-deploy (KIMI-først):
1. "Bruk kimi_shell: npm run lint"
2. "Bruk kimi_shell: npm run type-check"
3. "Bruk kimi_test: Kjør tester for endrede områder"
4. "Bruk kimi_shell: npm run build"
5. "Bruk kimi_shell: npm run verify"

Hvis KIMI ikke er tilgjengelig: Avbryt og rapporter.

Output:
- E) GO/NO-GO sjekk (alle 5 må være ✅)
- F) "Bruk kimi_deploy: Deploy [spesifikt] til [miljø]"
```

---

## Template D: Health Check

```
Health check: [OMRÅDE]

Bruk KIMI-først:
1. "Bruk kimi_shell: cd /Users/taj/klarpakke && npm run verify"
2. "Bruk kimi_monitor: Sjekk systemhelse"
3. "Bruk kimi_db: Sjekk DB-status"

Hvis KIMI ikke er tilgjengelig: Si det eksplisitt.

Output:
- A) GO/NO-GO
- B) Eventuelle rotårsaker
- C) Tiltak hvis NO-GO
- D) P0 hvis kritisk
```

---

## Template E: Refaktorering

```
Refaktorer: [KODE]

Mål: [FORBEDRING]

Bruk KIMI-først:
1. "Bruk kimi_read: path=[fil]"
2. "Bruk kimi_large: Analyser forbedringspotensial"
3. "Bruk kimi_refactor: Utfør refaktorering av [spesifikt]"

Test: "Bruk kimi_test: Kjør tester for [område]" – må passe før og etter.

Output:
- C) Beste løsning (hvorfor bedre)
- D) P2 (refaktorering er aldri P0)
- F) KIMI-prompt med presise filer
```

---

## Template F: Research/Spiking

```
Undersøk: [TEMA]

Bruk KIMI-først:
1. "Bruk kimi_small: Hva er [konsept]?"
2. "Bruk kimi_grep: pattern=[søk]"
3. "Bruk kimi_medium: Vurder alternativer"

Hvis KIMI ikke er tilgjengelig: Avbryt research.

Output:
- C) Beste løsning (anbefaling)
- D) P2 (research er ikke kritisk)
- F) Eventuell implementerings-prompt
```

---

## Hurtigmal (lim direkte inn)

```
"Bruk kimi_MEDIUM: [OPPGAVE] i /Users/taj/klarpakke.

Hvis KIMI ikke er tilgjengelig: Si fra eksplisitt.

Rapportér med format:
A) Status: GO/NO-GO
B) Rotårsak: [hvis relevant]
C) Beste løsning: [konkret]
D) Prioritet: P0/P1/P2
E) Verifisering: [sjekkliste]
F) KIMI-prompt: [klar til bruk]"
```
