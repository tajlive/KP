# 🚀 Rask Oppsettguide: Webflow Sider

**Tid:** 10-15 minutter  
**Mål:** Opprette alle 14 manglende sider

---

## Steg 1: Legg til CSS (2 min)

1. Åpne Webflow Designer: https://webflow.com/designer/69743573d50cc16bbbe54344
2. Klikk **⚙️ Project Settings** (tannhjul øverst til høyre)
3. Gå til **Custom Code**
4. Lim inn i **HEAD**-seksjonen:

```html
<!-- Coinbase Design System -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/tajlive/KP@main/web/styles/coinbase.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

5. **Lagre**

---

## Steg 2: Opprett Sider (10 min)

For hver side under:

1. Klikk **Pages** (venstre sidebar)
2. Klikk **+** (Create new page)
3. Fyll inn:
   - **Page Name:** [Navn fra tabellen]
   - **URL Slug:** [Slug fra tabellen]
4. Klikk **Create Page**
5. I Designer: Dra inn en **HTML Embed** komponent
6. Kopier HTML fra filen angitt
7. Lim inn i HTML Embed
8. **Lagre**

---

## Side-oversikt

| # | Navn | Slug | HTML-fil |
|---|------|------|----------|
| 1 | Signup | `signup` | `webflow-pages-missing/signup.html` |
| 2 | Login | `login` | `webflow-pages-missing/login.html` |
| 3 | Reset Password | `reset-password` | `webflow-pages-missing/auth-pages.html` (del 1) |
| 4 | Verify Email | `verify-email` | `webflow-pages-missing/auth-pages.html` (del 2) |
| 5 | 404 | `404` | `webflow-pages-missing/error-pages.html` (del 1) |
| 6 | 403 | `403` | `webflow-pages-missing/error-pages.html` (del 2) |
| 7 | 500 | `500` | `webflow-pages-missing/error-pages.html` (del 3) |
| 8 | Terms | `terms` | `webflow-pages-missing/legal-pages.html` (del 1) |
| 9 | Privacy | `privacy` | `webflow-pages-missing/legal-pages.html` (del 2) |
| 10 | Help | `help` | `webflow-pages-missing/legal-pages.html` (del 3) |
| 11 | About | `about` | `webflow-pages-missing/app-pages.html` (del 3) |
| 12 | History | `app/history` | `webflow-pages-missing/app-pages.html` (del 1) |
| 13 | Profile | `app/profile` | `webflow-pages-missing/app-pages.html` (del 2) |

---

## Steg 3: Publiser (2 min)

1. Klikk **Publish** (øverst til høyre)
2. Velg:
   - ☑️ Staging (klarpakke.webflow.io)
   - ☑️ Production (hvis du har custom domain)
3. Klikk **Publish to selected domains**

---

## Steg 4: Test

Besøk:
- https://klarpakke.webflow.io/signup
- https://klarpakke.webflow.io/login
- https://klarpakke.webflow.io/terms

Sjekk at styling vises korrekt (farger, fonter, knapper).

---

## HTML-filer lokasjon

Alle HTML-maler ligger i: `webflow-pages-missing/`

Vis dem med:
```bash
cat webflow-pages-missing/signup.html
cat webflow-pages-missing/login.html
cat webflow-pages-missing/error-pages.html
# etc...
```

---

**Spørsmål?** Sjekk `docs/WEBFLOW-COMPLETE-INTEGRATION.md` for detaljert guide.
