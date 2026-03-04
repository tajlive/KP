# 🚀 START I DAG - Kom i gang på 30 minutter

## Mål: Få de første 5 sidene inn i Webflow

---

## Forberedelser (5 min)

### 1. Sjekk at du har:
- [ ] Webflow konto (gratis plan holder for nå)
- [ ] Tilgang til klarpakke.no prosjektet
- [ ] GitHub repo tilgjengelig

### 2. Åpne disse i nettleseren:
- Webflow Dashboard
- GitHub repo (tombomann/klarpakke)
- Denne mappen: `/Users/taj/klarpakke/webflow-pages/`

---

## Steg 1: Last opp CSS (10 min)

### Alternativ A: GitHub Pages (raskest)

```bash
# I terminalen
cd /Users/taj/klarpakke
git checkout --orphan gh-pages
git rm -rf .
mkdir -p css js
cp webflow-pages/shared/styles.css css/
cp web/js/klarpakke-bundle.js js/
echo "Klarpakke Assets" > README.md
git add .
git commit -m "Add CSS and JS assets"
git push origin gh-pages --force
```

**Din CSS blir tilgjengelig på:**
```
https://tombomann.github.io/klarpakke/css/styles.css
```

### Alternativ B: Hvis GitHub Pages ikke fungerer

Last opp `webflow-pages/shared/styles.css` til:
- Cloudflare Pages
- Netlify
- Eller hvilken som helst CDN

---

## Steg 2: Konfigurer Webflow Site Settings (5 min)

### Gå til: Webflow → Site Settings → Custom Code

**Head Code:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://tombomann.github.io/klarpakke/css/styles.css">
```

**Footer Code (før `</body>`):**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script>
  window.KLARPAKKE_CONFIG = {
    supabaseUrl: 'https://din-prosjekt-ref.supabase.co',
    supabaseAnonKey: 'din-anon-key-her',
    stripePublishableKey: 'pk_test_din-key-her'
  };
</script>
<script src="https://tombomann.github.io/klarpakke/js/klarpakke-bundle.js"></script>
```

**Lagre endringer.**

---

## Steg 3: Kopier HTML-sider (10 min)

### Side 1: Home Page (/)

1. I Webflow: **Pages → Add Page**
2. **Name:** Home
3. **Slug:** (la være tom) ← Dette blir forsiden
4. **Settings (tannhjul) → Custom Code**
5. Kopier innholdet fra `webflow-pages/01-home.html`
6. Lim inn i feltet: **"Inside <body> tag"**
7. **Save**

### Side 2: Pricing (/pricing)

1. **Add Page**
2. **Name:** Pricing
3. **Slug:** `pricing`
4. **Custom Code**
5. Kopier `webflow-pages/02-pricing.html`
6. **Save**

### Side 3: Login (/login)

1. **Add Page**
2. **Name:** Login
3. **Slug:** `login`
4. **Custom Code**
5. Kopier `webflow-pages/03-login.html`
6. **Save**

### Side 4: Signup (/signup)

1. **Add Page**
2. **Name:** Signup
3. **Slug:** `signup`
4. **Custom Code**
5. Kopier `webflow-pages/04-signup.html`
6. **Save**

### Side 5: Dashboard (/app/dashboard)

1. **Add Page**
2. **Name:** Dashboard
3. **Slug:** `app/dashboard` ← Viktig med folder
4. **Custom Code**
5. Kopier `webflow-pages/05-dashboard.html`
6. **Save**

---

## Steg 4: Test lokalt (5 min)

### I Webflow:
1. Klikk **Preview** (øvre høyre hjørne)
2. Sjekk at:
   - [ ] Forsiden vises
   - [ ] Navigation fungerer
   - [ ] Farger er riktige (blå/grønn)
   - [ ] Fonter laster (Inter)
   - [ ] Mobilversjon ser OK ut

### Test på mobil:
1. Klikk Preview → Velg "Mobile" view
2. Sjekk at:
   - [ ] Tekst er lesbar
   - [ ] Knapper er store nok
   - [ ] Navigation fungerer

---

## Steg 5: Publiser! (5 min)

### I Webflow:
1. Klikk **Publish** (øvre høyre hjørne)
2. Velg **Publish to Selected Domains**
3. Velg **klarpakke.webflow.io** (eller din custom domain hvis satt opp)
4. Klikk **Publish to Selected Domains**

### Verifiser:
1. Åpne `https://klarpakke.webflow.io` (eller din URL)
2. Sjekk at alt fungerer
3. Test navigasjon mellom sider

---

## 🎉 Ferdig for i dag!

### Dette har du nå:
- ✅ Home page live
- ✅ Pricing page live
- ✅ Login page live
- ✅ Signup page live
- ✅ Dashboard page live
- ✅ CSS laster fra CDN
- ✅ Responsivt design

### Neste gang:
- Sett opp Supabase (2 timer)
- Konfigurer auth (1 time)
- Test signup flow (30 min)

---

## 🔧 Feilsøking

### Problem: CSS laster ikke
**Løsning:**
1. Sjekk at CSS-URL er riktig i Site Settings
2. Sjekk at gh-pages er publisert (gå til GitHub repo → Settings → Pages)
3. Vent 5 minutter (GitHub Pages bruker tid på å propagere)

### Problem: Norske tegn vises rart
**Løsning:**
1. Sjekk at HTML-filen er lagret som UTF-8
2. Legg til i `<head>`: `<meta charset="UTF-8">`

### Problem: Bilder mangler
**Løsning:**
- HTML-filene bruker placeholder-bilder
- Last opp ekte bilder til Webflow Assets
- Oppdater image-src i HTML-filene

### Problem: Lenker fungerer ikke
**Løsning:**
- Sjekk at alle sider har riktig slug
- Sjekk at lenker matcher slugs (/login, /signup, etc.)

---

## 📞 Hjelp

Stuck? Sjekk:
1. `MVP-LAUNCH-PLAN.md` for full plan
2. `PRODUCTION-DEPLOYMENT-GUIDE.md` for detaljer
3. Webflow University: https://university.webflow.com

---

**Tid brukt:** ~30 minutter  
**Resultat:** 5 sider live på Webflow  
**Status:** ✅ Klar for Supabase setup!
