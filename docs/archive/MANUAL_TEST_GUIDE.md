# 🔍 MANUAL TEST GUIDE - Klarpakke Nettside

**Dato:** 2026-02-21
**Utført av:** Kimi Code CLI (Automated)

---

## ✅ URLER Å TESTE I NETTLESER

### Hovedsider (Norsk)
| # | URL | Forventet | Status |
|---|-----|-----------|--------|
| 1 | https://www.klarpakke.no | Redirect til /no | ✅ 200 OK |
| 2 | https://www.klarpakke.no/no | Hjemside laster | ✅ 200 OK |
| 3 | https://www.klarpakke.no/no/dashboard | Dashboard laster | ✅ 200 OK |
| 4 | https://www.klarpakke.no/no/paper-trading | Paper trading laster | ✅ 200 OK |
| 5 | https://www.klarpakke.no/no/kurs | Kurs side laster | ✅ 200 OK |
| 6 | https://www.klarpakke.no/no/kontakt | Kontakt side laster | ✅ 200 OK |
| 7 | https://www.klarpakke.no/no/admin | Admin panel laster | ✅ 200 OK |

### Internasjonale versjoner
| # | URL | Forventet | Status |
|---|-----|-----------|--------|
| 8 | https://www.klarpakke.no/en | Engelsk version | ✅ 200 OK |
| 9 | https://www.klarpakke.no/th | Thai version | ✅ 200 OK |
| 10 | https://www.klarpakke.no/zh | Kinesisk version | ✅ 200 OK |

### API Endpoints
| # | URL | Forventet | Status |
|---|-----|-----------|--------|
| 11 | https://www.klarpakke.no/api/health | Health check OK | ✅ 200 OK |

---

## 🧪 MANUELLE SJEKKER (Utfør i Browser)

### For hver side, verifiser:

- [ ] **Side laster uten feil** (ingen 404/500 errors)
- [ ] **Navigation er synlig** på toppen
- [ ] **Ingen console errors** (åpne DevTools > Console)
- [ ] **Responsiv design** (test mobilvisning)
- [ ] **Farger og tema** er korrekte (mørk bakgrunn, gul/orange aksenter)

### Spesifikke sjekker:

#### 🏠 Hovedside (/no)
- [ ] Hero section med "Klarpakke Universitet" tekst
- [ ] CTA knapper synlige
- [ ] Feature cards (Paper Trading, AI Coaching, etc.)

#### 📊 Dashboard (/no/dashboard)
- [ ] Dashboard layout laster
- [ ] Sidebar/navigasjon synlig
- [ ] Charts/statistikker vises

#### 🎮 Paper Trading (/no/paper-trading)
- [ ] Trading interface laster
- [ ] Charts vises
- [ ] Order panel synlig

#### 🎓 Kurs (/no/kurs)
- [ ] Kurskort vises
- [ ] Video thumbnails laster
- [ ] Progress indicators fungerer

#### 🌐 Språkbytte
- [ ] Bytte til English fungerer
- [ ] Bytte til Thai fungerer
- [ ] Bytte til Chinese fungerer
- [ ] Alle tekster oppdateres korrekt

---

## 📊 ANALYTICS VERIFIKASJON

### I Nettleser:
1. Åpne https://www.klarpakke.no
2. Åpne DevTools (F12)
3. Gå til Network tab
4. Filtrer på "vercel"
5. **Forventet:** Ingen requests (site kjører på Cloud Run, ikke Vercel)

### I Vercel Dashboard:
1. Gå til https://vercel.com/tom-jensens-projects/klarpakke/analytics
2. **Forventet:** Tomt eller minimal data (ikke deployet til Vercel)

---

## 🔧 DEVTOOLS SJEKKER

### Console (F12 > Console)
```
Forventet: Ingen røde feilmeldinger
Tillatt: Gule warnings (f.eks. analytics ikke lastet)
```

### Network (F12 > Network)
```
Forventet: 
- HTML: 200 OK
- CSS: 200 OK  
- JS: 200 OK
- API kall: 200 OK
```

### Lighthouse (F12 > Lighthouse)
```
Performance: > 70 (mål: > 90)
Accessibility: > 90
Best Practices: > 90
SEO: > 90
```

---

## 🌍 SPRÅKTESTING

### Norsk (/no)
- [ ] Tekster på norsk
- [ ] Datoformat: DD.MM.YYYY
- [ ] Valuta: NOK kr

### English (/en)
- [ ] Tekster på engelsk
- [ ] Datoformat: MM/DD/YYYY eller YYYY-MM-DD
- [ ] Valuta: USD $

### Thai (/th)
- [ ] Tekster på thai
- [ ] RTL/LTR layout korrekt

### Chinese (/zh)
- [ ] Tekster på kinesisk
- [ ] Tegn vises korrekt

---

## ✅ AUTOMATED TEST RESULTS

**11/11 endpoints:** ✅ PASS

**Response times:** ✅ < 2s alle sider

**Server:** Google Cloud Run ✅

**SSL:** ✅ Gyldig sertifikat

---

## 📝 NOTATER

*Fyll inn etter manuell testing:*

- Lighthouse Performance: ___/100
- Lighthouse Accessibility: ___/100
- Lighthouse Best Practices: ___/100
- Lighthouse SEO: ___/100

**Funnet issues:**
- 

**Anbefalinger:**
- 

---

**Guide generert:** 2026-02-21 12:15 CET
