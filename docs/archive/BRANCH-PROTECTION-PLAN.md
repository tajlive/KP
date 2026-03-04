# Branch Protection Plan – main

**Dato:** 2026-02-21  
**Repo:** tomarnejensen/klarpakke  

---

## Anbefalte regler for `main`

### Pull Request Requirements

- [x] **Require a pull request before merging**
  - Required approving reviews: **1**
  - Dismiss stale PR approvals when new commits are pushed: **true**
  - Require review from Code Owners: **false** (kan aktiveres senere)

### Status Checks

- [x] **Require status checks to pass before merging**
  
  **Required checks:**
  - `lint` (🔍 Lint)
  - `type-check` (📝 Type Check)
  - `build` (🏗️ Build)
  
  **Optional checks (continue-on-error for Dependabot):**
  - `test` (🧪 Test) – kan feile på Dependabot uten å blokkere
  - `security` (🔒 Security Scan) – bør alltid kjøre, men ikke nødvendigvis blokkere

### Branch Rules

- [x] **Require linear history**: **true**
  - Forhindrer merge commits, gjør historien renere
  
- [x] **Include administrators**: **true**
  - Ingen unntak, alle følger samme regler

- [ ] **Restrict who can push to matching branches**: **false** (valgfritt)
  - Kan aktiveres hvis kun spesifikke team-medlemmer skal pushe

### Force Push Protection

- [x] **Allow force pushes**: **false**
- [x] **Allow deletions**: **false**

---

## Begrunnelse

### Hvorfor disse reglene?

1. **1 approval kreves**: Balanse mellom sikkerhet og smidighet. For et solo-prosjekt kan dette vurderes satt til 0, men med 1 approval får man en "mental sjekk" ved å lage PR.

2. **Lint + type-check + build required**: Dette er de kritiske valideringene som catcher syntaksfeil, typefeil, og byggfeil før de når main.

3. **Test optional for Dependabot**: Test kan feile på grunn av coverage-verktøy eller miljøforskjeller. Bedre å få Dependabot-oppdateringer inn enn å blokkere på test som uansett kjører lokalt.

4. **Linear history**: Gjør det enklere å rulle tilbake endringer og følge historikken. Krever bruk av "Squash and merge" eller "Rebase and merge".

5. **Include administrators**: Hindrer at selv repo-eier ved et uhell breaker main.

---

## Oppsettinstruksjoner

### Steg-for-steg (GitHub UI)

1. Gå til: https://github.com/tomarnejensen/klarpakke/settings/branches

2. Klikk **"Add rule"** (eller rediger eksisterende rule for `main`)

3. **Branch name pattern**: `main`

4. Kryss av:
   - [ ] Require a pull request before merging
     - [ ] Require approvals: **1**
     - [ ] Dismiss stale PR approvals when new commits are pushed
   
   - [ ] Require status checks to pass before merging
     - [ ] Require branches to be up to date before merging
     - I søkefeltet: Skriv "lint", velg `lint`
     - I søkefeltet: Skriv "type-check", velg `type-check`
     - I søkefeltet: Skriv "build", velg `build`
   
   - [ ] Require linear history
   
   - [ ] Include administrators
   
   - [ ] Allow force pushes: **Uncheck**
   
   - [ ] Allow deletions: **Uncheck**

5. Klikk **"Create"** eller **"Save changes"**

### Verifisering

Etter aktivering:

1. Lag en test-PR mot main
2. Verifiser at status checks vises i PR
3. Verifiser at merge-knappen er grå (disabled) til checks passerer
4. Godkjenn PRen og verifiser at den kan merges

---

## Feilsøking

### Problem: Status checks vises ikke i PR

**Løsning:**
- Sjekk at workflow faktisk har kjørt på PR
- Vent til første run er ferdig før du legger til required checks
- Navn må matche eksakt: `lint`, `type-check`, `build`

### Problem: Dependabot-PRer blokkeres

**Løsning:**
- `continue-on-error: true` gjør at check vises som grønn selv om den feiler
- Hvis fortsatt problem: Fjern test fra required checks

### Problem: "This branch is out-of-date with the base branch"

**Løsning:**
- Dette er ønsket oppførsel med "Require branches to be up to date"
- Klikk "Update branch" i PRen for å merge inn siste main

---

## Neste steg etter aktivering

1. **Test med en liten PR** – verifiser at protection fungerer
2. **Informer team** (hvis relevant) – alle må lage PR nå
3. **Overvåk første uke** – juster hvis det blir for tungt
4. **Vurder Code Owners** – hvis flere bidrattere: legg til CODEOWNERS fil

