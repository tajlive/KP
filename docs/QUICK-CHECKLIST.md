# ✅ KLARPAKKE - Morgen Sjekkliste

## Først: Custom Code (5 min)

```
☐ Åpne Webflow Designer
☐ Klikk ⚙️ → Custom Code
☐ Lim inn HEAD (fra EMBEDDED_HEAD.txt)
☐ Lim inn FOOTER (fra EMBEDDED_FOOTER.txt)
☐ Lagre
```

---

## Deretter: 5 Sider (25 min)

### Side 1: Login (/login) - 5 min
```
☐ Trykk P → + Create new page
☐ Name: Login, Slug: login
☐ Dra inn: Section → Container → Form
☐ Form fields:
   - Email: login-email
   - Password: login-password
   - Submit: Logg inn
☐ Ferdig!
```

### Side 2: Signup (/signup) - 5 min
```
☐ Trykk P → + Create new page
☐ Name: Signup, Slug: signup
☐ Samme som Login, men:
   - Email: signup-email
   - Password: signup-password
   - Confirm: signup-confirm
☐ Ferdig!
```

### Side 3: Dashboard (/app/dashboard) - 10 min
```
☐ Trykk P → + Create new page
☐ Name: Dashboard, Slug: app/dashboard ← VIKTIG med /app/
☐ Dra inn:
   - Navbar (Logo, Dashboard, Settings, Logout)
   - Div: id="stats-total"
   - Div: id="stats-pending"
   - Div: id="stats-approved"
   - Div: id="signals-list"
☐ Ferdig!
```

### Side 4 & 5: Home + Pricing - 5 min
```
☐ Sjekk at Home (/) fungerer
☐ Sjekk at Pricing (/pricing) fungerer
☐ Oppdater med innhold fra webflow-final/ hvis nødvendig
```

---

## Til slutt: Publiser (2 min)

```
☐ Klikk Publish (øverst høyre)
☐ Velg: klarpakke-c65071.design.webflow.com
☐ Klikk Publish
☐ Vent 1 minutt
```

---

## Test (3 min)

```
☐ Åpne: https://klarpakke-c65071.design.webflow.com/
☐ Åpne: https://klarpakke-c65071.design.webflow.com/login
☐ Åpne: https://klarpakke-c65071.design.webflow.com/signup
☐ Åpne: https://klarpakke-c65071.design.webflow.com/app/dashboard
☐ Sjekk: Ingen 404
☐ Sjekk: Logo vises
☐ Sjekk: Console uten errors (F12)
```

---

## 🎉 GRATULERER! Soft launch complete!

---

**Tips:** Ta en kopp kaffe først! ☕
