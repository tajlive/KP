# 🧪 Test Plan - Klarpakke

**Versjon:** 1.0.0  
**Dato:** 1. februar 2026  
**Status:** Klar for testing

---

## 📋 Oversikt

Denne test-planen dekker alle kritiske funksjoner før soft launch.

### Test Kategorier
1. Backend Testing
2. Frontend Testing  
3. Integration Testing
4. Security Testing
5. Performance Testing

---

## 1. 🔧 Backend Testing

### 1.1 Database Connection
```bash
# Test med curl
curl -s "https://swfyuwkptusceiouqlks.supabase.co/rest/v1/signals?select=count" \
  -H "apikey: sb_publishable_HdOqZNqqfbP2Uk_QpYkeeQ_Qs35S5De"
```
**Forventet:** `{"count":120}` ✅

### 1.2 Edge Functions
| Funksjon | Test | Forventet |
|----------|------|-----------|
| `public-config` | `curl /functions/v1/public-config` | JSON config |
| `get-signals` | Autentisert request | Signals array |
| `approve-signal` | Autentisert POST | Success/Error |
| `create-position` | Autentisert POST | Position object |

### 1.3 Auth System
| Test | Fremgangsmåte | Forventet |
|------|---------------|-----------|
| Signup | POST /auth/v1/signup | Rate limit (429) |
| Login | POST /auth/v1/token | JWT token |
| Refresh | POST /auth/v1/refresh | Ny JWT |
| Logout | POST /auth/v1/logout | Success |

### 1.4 RLS (Row Level Security)
| Test | Fremgangsmåte | Forventet |
|------|---------------|-----------|
| Anon read signals | Uten token | 401/Blokkert |
| Auth read signals | Med token | 200/Data |
| Anon write | Uten token | 401/Blokkert |
| Auth write | Med token | 201/Created |

---

## 2. 🎨 Frontend Testing

### 2.1 Sider - Visuell Test
Åpne hver side og sjekk:
- [ ] Logo vises korrekt
- [ ] Cookie banner vises (første besøk)
- [ ] Cookie banner forsvinner etter "Godta"
- [ ] Ingen console errors
- [ ] Responsive design fungerer

| Side | URL | Status |
|------|-----|--------|
| Home | `/` | ⬜ |
| Pricing | `/pricing` | ⬜ |
| Login | `/login` | ⬜ |
| Signup | `/signup` | ⬜ |
| Dashboard | `/app/dashboard` | ⬜ |
| Signals | `/app/signals` | ⬜ |
| Paper Trading | `/app/paper-trading` | ⬜ |
| Live Trading | `/app/live-trading` | ⬜ |
| History | `/app/history` | ⬜ |
| Settings | `/app/settings` | ⬜ |
| Reset Password | `/reset-password` | ⬜ |
| Verify Email | `/verify-email` | ⬜ |
| 404 | `/404` | ⬜ |
| Terms | `/terms` | ⬜ |
| Privacy | `/privacy` | ⬜ |
| Help | `/help` | ⬜ |
| Quiz | `/quiz` | ⬜ |

### 2.2 Meta Tags Test
```bash
# Sjekk OG tags
curl -s https://klarpakke.no/ | grep "og:title"
curl -s https://klarpakke.no/ | grep "og:description"
```

**Forventet:** Korrekte meta tags for hver side

### 2.3 Favicon Test
- [ ] Favicon vises i browser tab
- [ ] Favicon er SVG format

### 2.4 Cookie Consent Test
| Scenario | Fremgangsmåte | Forventet |
|----------|---------------|-----------|
| Første besøk | Åpne site i incognito | Banner vises |
| Aksepter | Klikk "Godta" | Banner forsvinner, lagres i localStorage |
| Retur besøk | Lukk og åpne igjen | Banner vises ikke |
| Slett samtykke | Clear localStorage | Banner vises igjen |

---

## 3. 🔗 Integration Testing

### 3.1 Auth Flow
| Steg | Handling | Forventet |
|------|----------|-----------|
| 1 | Gå til /signup | Signup form vises |
| 2 | Fyll inn email/passord | Validert input |
| 3 | Submit | Redirect til /verify-email |
| 4 | Sjekk email | Verifikasjonsmail mottatt |
| 5 | Klikk verifiseringslenke | Email verifisert |
| 6 | Gå til /login | Login form vises |
| 7 | Login med credentials | JWT lagret, redirect til dashboard |
| 8 | Dashboard laster | Signals vises |

### 3.2 Paper Trading Flow
| Steg | Handling | Forventet |
|------|----------|-----------|
| 1 | Gå til /app/paper-trading | Trading interface vises |
| 2 | Se signaler | Pending signals listes |
| 3 | Klikk "Trade" | Modal/confirm vises |
| 4 | Bekreft trade | Position opprettet |
| 5 | Se positions | Ny position i listen |
| 6 | Lukk position | P&L kalkulert |

### 3.3 Dashboard Flow
| Steg | Handling | Forventet |
|------|----------|-----------|
| 1 | Login | Dashboard laster |
| 2 | Se signaler | Signal cards vises |
| 3 | Filtrer signaler | Filter fungerer |
| 4 | Sorter signaler | Sortering fungerer |
| 5 | Klikk signal | Detaljer vises |

---

## 4. 🔒 Security Testing

### 4.1 Auth Security
| Test | Fremgangsmåte | Forventet |
|------|---------------|-----------|
| SQL Injection | `' OR '1'='1` i input | Ingen effekt |
| XSS | `<script>alert('xss')</script>` | Escaped/Blokkert |
| CSRF | Request uten token | 403 Forbidden |
| Brute force | Mange failed logins | Rate limit trigges |

### 4.2 API Security
| Test | Fremgangsmåte | Forventet |
|------|---------------|-----------|
| Uten token | Request til /get-signals | 401 Unauthorized |
| Ugyldig token | Request med fake JWT | 401 Unauthorized |
| Eksprert token | Request med gammel JWT | 401 + refresh prompt |
| SQL Injection i API | `' DROP TABLE` i param | Escaped/Error |

### 4.3 RLS Security
| Test | Fremgangsmåte | Forventet |
|------|---------------|-----------|
| User A leser User B data | Query med user_id filter | Kun egne data |
| User endrer andres data | Update med annen user_id | Ingen effekt |
| Anon leser auth data | Query auth.users | Blokkert |

---

## 5. ⚡ Performance Testing

### 5.1 Page Load
| Side | Maks Tid | Test |
|------|----------|------|
| Home | < 2s | Lighthouse |
| Dashboard | < 3s | Lighthouse |
| Login | < 1.5s | Lighthouse |

### 5.2 API Response
| Endpoint | Maks Tid | Test |
|----------|----------|------|
| /public-config | < 500ms | curl -w "%{time_total}" |
| /get-signals | < 1s | curl -w "%{time_total}" |
| /create-position | < 1.5s | curl -w "%{time_total}" |

### 5.3 Lighthouse Scores
| Kategori | Mål | Status |
|----------|-----|--------|
| Performance | > 90 | ⬜ |
| Accessibility | > 90 | ⬜ |
| Best Practices | > 90 | ⬜ |
| SEO | > 90 | ⬜ |

---

## 6. 📱 Device Testing

### 6.1 Responsive Design
Test på følgende størrelser:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### 6.2 Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## 7. 🐛 Bug Reporting Template

```markdown
## Bug Report

**Tittel:** [Kort beskrivelse]

**Miljø:**
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Skjermstørrelse: [Desktop/Mobile]

**Steg for å reprodusere:**
1. Gå til [URL]
2. Klikk på [Element]
3. [Handling]

**Forventet:** [Hva skulle skje]

**Faktisk:** [Hva skjedde]

**Screenshots:** [Hvis relevant]

**Console errors:**
```
[Lim inn console errors her]
```
```

---

## 8. ✅ Pre-Launch Checklist

### Kritisk (MÅ fungere)
- [ ] Auth signup fungerer
- [ ] Auth login fungerer
- [ ] Dashboard laster signaler
- [ ] Paper trading fungerer
- [ ] Cookie consent fungerer
- [ ] HTTPS fungerer
- [ ] Alle sider laster uten 404

### Viktig (BØR fungere)
- [ ] OG tags fungerer
- [ ] Favicon vises
- [ ] Logo vises korrekt
- [ ] Responsive design
- [ ] Ingen console errors
- [ ] Mobil-funksjonell

### Nice-to-have (KAN vente)
- [ ] Analytics tracking
- [ ] Error logging
- [ ] Performance monitoring

---

## 📊 Test Results Summary

| Kategori | Tester | Pass | Fail | Status |
|----------|--------|------|------|--------|
| Backend | 10 | 0 | 0 | ⬜ |
| Frontend | 17 | 0 | 0 | ⬜ |
| Integration | 15 | 0 | 0 | ⬜ |
| Security | 12 | 0 | 0 | ⬜ |
| Performance | 8 | 0 | 0 | ⬜ |
| **TOTAL** | **62** | **0** | **0** | **⬜** |

---

**Klar for testing!** 🧪

*Sist oppdatert: 2026-02-01*
