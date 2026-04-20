# 🚨 DEPLOY-KONVENSJON — Klarpakke
> Oppdatert: 2026-04-20 | Eier: Tomar | Auto-deploy aktiv via GitHub Actions + Vercel CLI

## ✅ Auto-deploy er AKTIVT

**Git push til `main` trigger automatisk deploy til produksjon via GitHub Actions.**

Arkitektur:
- `push` → `main` → GitHub Actions `🚀 Deploy` → `npm run build` → `npx vercel deploy --prod` → health check → Cloudflare purge
- `workflow_run` etter `✅ PR Check` beholdes som backup-trigger
- `workflow_dispatch` beholdes for manuell deploy/preview

### Historisk kontekst (pre-2026-04-20):
Native GitHub → Vercel-integrasjon var deaktivert pga canceled builds (concurrent build-limit/webhook-feil).  
Løsning: GitHub Actions med Vercel CLI gir full kontroll over bygg, validering, rollback og notifications.

---

## ✅ Deploy-flyt (GitHub Actions auto-deploy)

### Automatisk (standard):
```bash
git push origin main
# → GitHub Actions bygger, deployer, verifiserer automatisk
```

### Manuell (nødscenario / preview):
```bash
# Steg 1 — DB-status
npx supabase db status

# Steg 2 — CI-pipeline (lint + tester)
npm run lint:gate && npm run test:unit

# Steg 3 — Deploy via GitHub Actions (manuell trigger)
# Gå til https://github.com/tajlive/KP/actions/workflows/deploy.yml
# → Run workflow → velg environment

# ELLER direkte Vercel CLI (kun nødscenario)
npx vercel --prod
```

### Vercel deploy kommandoer:
| Target | Kommando |
|---|---|
| Produksjon | `npx vercel --prod` |
| Preview | `npx vercel` |
| Status | `npx vercel ls` |

---

## Bakgrunn
- `kprod`-scriptet i `package.json` bruker Vercel CLI direkte
- GitHub-Vercel webhook trigger kansellerte bygg (bekreftet 2026-04-15)
- Manuell `npx vercel --prod` er eneste pålitelige deploy-metode inntil integrasjonen er fikset

## For Kimi:
- **Standard**: `git push origin main` er tilstrekkelig — GitHub Actions håndterer resten
- **Manuell**: `kimi_deploy target=prod` (Vercel CLI) kun ved nødscenario
- Logg alltid deploy-URL i handoff-fil
- Verifiser med `https://www.klarpakke.no/api/health` etter deploy

## For Perplexity:
- Ved spørsmål om deploy → `git push origin main` trigger auto-deploy
- GitHub Actions bygger, deployer og verifiserer automatisk
- Manuell deploy: henvis til GitHub Actions → `🚀 Deploy` → Run workflow

---

## Status
- [x] Auto-deploy via GitHub Actions + Vercel CLI — AKTIV (2026-04-20)
- [x] `push` trigger på `main` — aktivert i `.github/workflows/deploy.yml`
- [x] `workflow_run` backup etter PR Check — beholdes
- [x] Native Vercel Git-integrasjon — fortsatt deaktivert (bruker GitHub Actions i stedet)
- [x] TypeScript strict gate — `ignoreBuildErrors: false`, deploy feiler raskt hvis build feiler
