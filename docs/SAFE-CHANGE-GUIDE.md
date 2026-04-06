# Trygge Endringer i Klarpakke – Guide

**Mål:** Gjøre endringer uten å ødelegge design eller funksjonalitet.

---

## 1. Pre-Change Ritual (ALLTID)

### Steg A: Etabler Baseline
```bash
# 1. Sjekk at du er på clean main
git status  # Må være "nothing to commit"

# 2. Verifiser nåværende tilstand
npm run verify
npm run test:unit
npm run build

# 3. Noter resultat
# "Baseline: ✅ All tests pass, build OK"
```

### Steg B: Forstå Hva Du Skal Endre
```bash
# Finn alle filer som berøres
grep -r "[komponent]" src/ --include="*.ts" --include="*.tsx" -l

# Sjekk avhengigheter
# Hvis du endrer A, hva brekker i B, C, D?
```

### Steg C: Les Design-kontrakt
- `docs/design-assessment-2026.md` – Design-prinsipper
- `docs/design-konkurranse-analyse-2026.md` – Konkurrent-analyse
- `src/lib/design/tokens.ts` – Design tokens (FARGER, SPACING, etc.)

---

## 2. Design-Preservasjon Regler

### ✅ Gjør ALLTID:
1. **Bruk design tokens** – Aldri hardkodede verdier
   ```tsx
   // ✅ Riktig
   className={cn(buttonVariants({ variant: "primary" }))}
   
   // ❌ Feil
   className="bg-blue-500 text-white px-4 py-2"
   ```

2. **Behold premium-uttrykk** – Mørkt tema, Lucide-ikoner
3. **Følg i18n-regler** – Bruk `useTranslations`, ikke hardkodet tekst
4. **Test visuelt** – Sjekk i browser etter endring

### ❌ Aldri:
1. Endre farger direkte i komponenter
2. Fjerne Framer Motion animasjoner uten erstatning
3. Bryte responsiv design (mobile-first)
4. Introduksere nye UI-mønstre uten godkjenning

---

## 3. Funksjonalitet-Preservasjon

### Pattern: Wrapper/Extension (Foretrukket)
```tsx
// I stedet for å endre eksisterende komponent:
// ✅ Lag wrapper
export function NewFeatureWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="new-feature">
      {children}
    </div>
  );
}

// Bruk sammen med eksisterende
<OldComponent />
<NewFeatureWrapper>
  <OldComponent />
</NewFeatureWrapper>
```

### Pattern: Feature Flag
```tsx
// ✅ Gradvis utrulling
const isNewFeatureEnabled = process.env.NEXT_PUBLIC_NEW_FEATURE === 'true';

return (
  <>
    {isNewFeatureEnabled ? <NewComponent /> : <OldComponent />}
  </>
);
```

### Pattern: Incremental Migration
1. Lag ny implementasjon ved siden av gammel
2. Migrer én consumer om gangen
3. Test etter hver migrering
4. Fjern gammel når alle er migrert

---

## 4. Testing Strategi

### Før Endring:
```bash
# 1. Kjør alle tester
npm run test:unit

# 2. Sjekk spesifikt for området
echo "Tester for trading:"
npm run test:unit -- src/lib/trading/

# 3. E2E hvis kritisk
npm run test:e2e:critical:chromium
```

### Etter Endring:
```bash
# 1. Samme tester må passere
npm run test:unit

# 2. Bygg må fungere
npm run build

# 3. Lint/typecheck
npm run lint
npm run type-check

# 4. Manuelle sjekker
# - Åpne i browser
# - Test responsivt
# - Test med forskjellige data
```

---

## 5. Git Strategi for Trygge Endringer

### Branch-navn:
```
feature/KLA-XXX-kort-beskrivelse
fix/KLA-XXX-bug-beskrivelse
refactor/komponent-navn
```

### Commit-meldinger:
```
feat: Legg til [feature] i [komponent]
fix: Rett [bug] i [komponent]  
refactor: Forenkle [komponent] uten funksjonsendring
docs: Oppdater [dokumentasjon]
```

### Rollback-plan:
```bash
# Før push, sjekk at du kan rulle tilbake:
git log --oneline -5  # Se historie

# Hvis noe går galt:
git revert HEAD  # Lag ny commit som reverserer
# eller
git reset --hard HEAD~1  # Fjern siste commit (farlig!)
```

---

## 6. Verifiserings-Checkliste

### Design:
- [ ] Farger fra design tokens
- [ ] Spacing fra design tokens
- [ ] Typografi fra design tokens
- [ ] Ikoner fra Lucide
- [ ] Animerte overganger (Framer Motion)
- [ ] Mørkt tema fungerer
- [ ] Responsivt (mobile, tablet, desktop)

### Funksjonalitet:
- [ ] Eksisterende tester passerer
- [ ] Ny funksjonalitet testet
- [ ] Edge cases håndtert
- [ ] Ingen console errors
- [ ] Ingen TypeScript errors
- [ ] Bygg suksess

### Tilgjengelighet:
- [ ] Keyboard-navigasjon fungerer
- [ ] ARIA labels der nødvendig
- [ ] Kontrast OK

---

## 7. Når Noe Går Galt

### Hvis tester feiler:
1. Ikke panikk – les feilmelding nøye
2. Identifiser hvilken test som feiler
3. Forstå hva testen sjekker
4. Fiks enten kode eller test (aldri begge samtidig uten å tenke)

### Hvis design brekker:
1. Sjekk mot design tokens
2. Sammenlign med production
3. Bruk Chrome DevTools for å inspisere
4. Rull tilbake hvis nødvendig

### Hvis funksjonalitet brekker:
1. Identifiser siste kjente gode commit
2. Bruk `git bisect` for å finne problem
3. Rull tilbake til sist kjente gode
4. Debug i isolasjon

---

## 8. KIMI-prompt for Trygge Endringer

```
Gjør [ENDRING] i /Users/taj/klarpakke.

Krav:
1. Verifiser baseline først (npm run verify, test:unit, build)
2. Les docs/design-assessment-2026.md for design-regler
3. Bruk design tokens fra src/lib/design/tokens.ts
4. Behold all eksisterende funksjonalitet
5. Kjør alle tester etter endring
6. Bygg må passere

Rapportér:
A) Status: GO/NO-GO
B) Design-verifisering: [sjekkliste]
C) Test-resultat: [antall passerer/failer]
D) Build: [suksess/fail]
E) Eventuelle breaking changes: [ja/nei + forklaring]
```

---

**Husk:** Bedre å bruke 10 minutter ekstra på verifisering enn å debugge i produksjon!
