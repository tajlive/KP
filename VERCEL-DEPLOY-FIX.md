# Vercel Deploy Fix - GitHub Actions First

## Problem
Vercel deployer automatisk ved push til main, uavhengig av GitHub Actions resultat.

## Løsning: Skru av auto-deploy i Vercel

### Steg 1: Vercel Dashboard
1. Gå til https://vercel.com/dashboard
2. Velg **klarpakke** prosjekt
3. Gå til **Settings** → **Git**
4. Under **Deploy Hooks** eller **Git Integration**:
   - Skru av **Auto Deploy on Push**
   - Eller sett **Production Branch Protection**

### Steg 2: Alternativ - Deploy via GitHub Actions

Endre `.github/workflows/deploy.yml` til å bruke `vercel` CLI:

```yaml
# .github/workflows/deploy.yml (modifisert)
- name: Deploy to Vercel
  if: github.event.workflow_run.conclusion == 'success'
  run: |
    npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Steg 3: Midlertidig fiks (RASK)

Legg til en "gate" i bygget som feiler hvis GitHub Actions ikke er grønn:

```javascript
// scripts/wait-for-github-actions.mjs
// Kjør i prebuild for å sjekke status
```

## Rask Fiks (uten Vercel-endring)

La meg legge til en sjekk som feiler bygget lokalt først:
