# 🚨 KRITISK BESLUTNING — Deploy-konvensjon for Klarpakke
> Skrevet: 2026-04-15 | Eier: Tomar | Må leses av ALLE agenter (Kimi + Perplexity) FØR enhver deploy

## ⛔ ALDRI bruk GitHub-push som deploy-mekanisme

**GitHub → Vercel-integrasjonen er DEAKTIVERT / upålitelig.**  
Siste 6+ commits ble CANCELED i Vercel automatisk bygg.  
Rotårsak: concurrent build-limit, betalingsgrense eller webhook-feil.

---

## ✅ ALLTID bruk Vercel CLI (kprod) for deploy til produksjon

### Riktig deploy-flyt (OBLIGATORISK rekkefølge):

```bash
# Steg 1 — DB-status
npx supabase db status

# Steg 2 — CI-pipeline (lint + tester)
npm run lint:gate && npm run test:unit

# Steg 3 — Health check pre-deploy
# (kimi_monitor check=full)

# Steg 4 — Deploy til Vercel (IKKE git push!)
npx vercel --prod

# Steg 5 — Health check post-deploy
# (kimi_monitor check=prod)

# Steg 6 — Git push (ETTER vellykket deploy, kun for versjonskontroll)
git push origin main
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
- Bruk `kimi_deploy target=prod` (som kaller `npx vercel --prod` internt)
- IKKE avslutt session med bare `git push origin main` uten Vercel deploy
- Logg alltid deploy-URL i handoff-fil

## For Perplexity:
- Ved spørsmål om deploy → henvis ALLTID til `npx vercel --prod` eller `kimi_deploy`
- Git push alene = IKKE deployet til produksjon
- Valider med kimi_monitor etter deploy

---

## Status på GitHub→Vercel-integrasjon
- [ ] TODO: Undersøk i Vercel Dashboard → Project Settings → Git → check build status
- [ ] TODO: Vurder om integrasjonen skal re-aktiveres eller forbli deaktivert
