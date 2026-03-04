# 🌅 WEBFLOW MORNING GUIDE - 30 Min Deploy

**Forberedt av:** Claude (nattarbeid)  
**Tid for deg:** 30 minutter  
**Mål:** 5 kritiske sider live

---

## ☕ FØR DU STARTER

1. ☕ Drikk kaffen din
2. 🧠 Vær uthvilt
3. ✅ Sjekk at du er logget inn i Webflow

---

## 🎯 DAGENS 5 SIDER (Prioritert)

| Prioritet | Side | Tid | Viktighet |
|-----------|------|-----|-----------|
| 1 | Home (/) | 5 min | Landing |
| 2 | Login (/login) | 5 min | Auth |
| 3 | Signup (/signup) | 5 min | Conversion |
| 4 | Dashboard (/app/dashboard) | 10 min | Core feature |
| 5 | Pricing (/pricing) | 5 min | Betaling |

**Total: 30 min → Soft launch!**

---

## 📋 STEG-FOR-STEG

### Steg 0: Forberedelser (2 min)

1. Åpne Webflow Designer: https://webflow.com/designer/69743573d50cc16bbbe54344
2. Åpne denne filen i VS Code: `webflow-final/`
3. Ha `EMBEDDED_HEAD.txt` og `EMBEDDED_FOOTER.txt` klar

---

### Steg 1: Legg til Custom Code (5 min)

**I Webflow Designer:**
1. Klikk **⚙️ Project Settings** (tannhjulet øverst)
2. Gå til **Custom Code** tab

#### HEAD Code:
```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Klarpakke Config -->
<script>
  window.KLARPAKKE_CONFIG = {
    SUPABASE_URL: 'https://swfyuwkptusceiouqlks.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdXNjZWlvdXFsa3MiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc2OTE4NjgwMSwiZXhwIjoyMDg0NzYyODAxfQ.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk',
    VERSION: '1.0.0'
  };
</script>
```

#### FOOTER Code:
Lim inn fra: `EMBEDDED_FOOTER.txt`

3. Klikk **Save Changes**

---

### Steg 2: Opprett Login-side (5 min)

**I Webflow Designer:**

1. Trykk **P** (Pages panel)
2. Klikk **+** (Create new page)
3. **Page Name:** `Login`
4. **Slug:** `login`
5. Klikk **Create Page**

**Legg til innhold:**

1. Dra inn en **Section** (fra Add panel)
2. Dra inn en **Container**
3. Dra inn en **Form** (velg "Blank")

**Konfigurer Form:**
- Form Name: `login-form`
- Action: la være tom (håndteres av JS)
- Method: GET

**Form Fields:**
1. **Email field:**
   - Type: Email
   - Name: `login-email`
   - Required: ✅
   - ID: `login-email`

2. **Password field:**
   - Type: Password
   - Name: `login-password`
   - Required: ✅
   - ID: `login-password`

3. **Submit button:**
   - Text: `Logg inn`
   - ID: `login-submit`

**HTML Embed (valgfritt for styling):**
```html
<div data-klarpakke-page="/login" style="max-width:400px;margin:40px auto;padding:30px;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;">
  <h1 style="color:#0f172a;margin-bottom:24px;">Logg inn</h1>
  <p style="color:#64748b;">Velkommen tilbake til Klarpakke</p>
</div>
```

---

### Steg 3: Opprett Signup-side (5 min)

**Samme prosess som Login:**

1. Trykk **P**
2. Klikk **+**
3. **Page Name:** `Signup`
4. **Slug:** `signup`
5. Klikk **Create Page**

**Form Fields:**
- Email: `signup-email`
- Password: `signup-password`
- Confirm Password: `signup-confirm`
- Submit: `signup-submit`

---

### Steg 4: Opprett Dashboard (10 min)

**Viktigst!** Denne er hovedappen.

1. Trykk **P**
2. Klikk **+**
3. **Page Name:** `Dashboard`
4. **Slug:** `app/dashboard` (Viktig! Med /app/)
5. Klikk **Create Page**

**Legg til struktur:**

1. **Navbar:**
   - Logo: "Klarpakke"
   - Link: Dashboard
   - Link: Settings
   - Link: Logout

2. **Stats Section:**
   - Div med ID: `stats-total`
   - Div med ID: `stats-pending`
   - Div med ID: `stats-approved`

3. **Signals Section:**
   - Div med ID: `signals-list`
   - Placeholder text: "Laster signaler..."

---

### Steg 5: Verifiser Home og Pricing (5 min)

**Sjekk at de eksisterende sidene ser OK ut:**
- Home: Har hero, CTA, features?
- Pricing: Har pris-bokser?

**Hvis ikke, oppdater:**
- Kopier fra `webflow-final/01-home.html`
- Kopier fra `webflow-final/02-pricing.html`

---

## 🚀 PUBLISER

### Steg 6: Publish (2 min)

1. Klikk **Publish** (øverst til høyre)
2. Velg **klarpakke-c65071.design.webflow.com**
3. Klikk **Publish to Selected Domains**

---

## ✅ TEST

### Steg 7: Verifiser (3 min)

Åpne i nettleser:
- https://klarpakke-c65071.design.webflow.com/
- https://klarpakke-c65071.design.webflow.com/login
- https://klarpakke-c65071.design.webflow.com/signup
- https://klarpakke-c65071.design.webflow.com/app/dashboard

**Sjekk:**
- [ ] Sidene laster uten 404
- [ ] Logo vises
- [ ] Login-form ser OK ut
- [ ] Ingen console errors (F12)

---

## 🎉 GRATULERER!

**Du har nå:**
- ✅ 5 kritiske sider live
- ✅ Auth-system klart
- ✅ Supabase koblet til
- ✅ Soft launch gjennomført!

---

## 📞 HVIS NOE GÅR GALT

**Console errors?**
- Sjekk at Custom Code er lagret
- Sjekk at element IDs matcher

**404 på sider?**
- Verifiser slug er korrekt (f.eks. `app/dashboard` ikke `dashboard`)

**Auth fungerer ikke?**
- Sjekk at Supabase config er i HEAD code
- Sjekk at JS laster i FOOTER

---

**God morgen og lykke til!** 🚀
