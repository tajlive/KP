# Antigravity Deploy Prompt - Klarpakke til Produksjon

## 🚀 Oppdrag
Deploy alle endringer fra i dag til Vercel produksjon med full verifisering.

## 📋 Sjekkliste

### Pre-Deploy (Kjør i terminal)
```bash
cd ~/klarpakke
git status  # Må være clean
git pull origin main
npm run verify
```

### Test & Bygg
```bash
npm run type-check      # ✅ Ingen errors
npm run lint           # ✅ 98 warnings (akseptabelt)
npm run i18n:validate  # ✅ NO/EN: 2007/2007 keys
npm run test:unit      # ✅ Alle passerer
npm run build          # ✅ 467 sider, ingen MISSING_MESSAGE
```

### Deploy
```bash
npx vercel --prod --yes
```

### Post-Deploy Verifisering (vent 3 min)
```bash
sleep 180
curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no  # Forventet: 200
curl -s https://www.klarpakke.no/no/login | grep -q "Logg inn" && echo "✅ Login OK"
curl -s https://www.klarpakke.no/no | grep -i "missing" || echo "✅ i18n OK"
```

## 🔍 Hva som Deployes

1. **Hydration Fix** - React hydration errors fikset
2. **OAuth E2E Tests** - Test infrastruktur for auth
3. **i18n Fiks** - 8 nye oversettelsesfiler, alle MISSING_MESSAGE errors borte

## 📁 Viktige Filer Endret
- `src/lib/hooks/useClientOnly.ts` (ny)
- `src/components/ui/ClientOnly.tsx` (ny)
- `src/shared/navigation/BottomTabs.tsx`
- `src/features/dashboard/DashboardContent.tsx`
- `e2e/auth/oauth-flow.spec.ts` (ny)
- `messages/no/*.json` (8 nye filer)
- `messages/en/*.json` (8 nye filer)
- `src/i18n.ts`

## ✅ Suksesskriterier
- [ ] Deploy viser "✅ Production: https://www.klarpakke.no"
- [ ] HTTP 200 på https://www.klarpakke.no
- [ ] Ingen nye errors i Sentry
- [ ] Login-side fungerer
- [ ] i18n: Ingen "MISSING" i console

## 🆘 Hvis Noe Feiler
```bash
# Rollback
npx vercel rollback
# Verifiser
curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no
```

## 📊 Forventet Output
```
🔍  Inspect: https://vercel.com/tombomann/klarpakke/xxxxx
✅  Production: https://www.klarpakke.no
```

---

**Når du er ferdig:**
1. Kopier deploy-URL fra Vercel output
2. Verifiser at https://www.klarpakke.no fungerer
3. Rapporter suksess/feil tilbake

**Full plan:** `.mempalace/plans/TASK-20240412-DEPLOY-PROD.md`
