# Runbook: Emergency stop TAJ Robot

**Bruk når:** TAJ Robot oppfører seg uventet (taper raskt, åpner for mange posisjoner)  

## Steg

### 1. Logg inn på admin

https://www.klarpakke.no/admin/login

---

### 2. Gå til Auto-trading

https://www.klarpakke.no/admin/auto-trading

---

### 3. Klikk "Force lukk alle posisjoner"

Stor rød knapp øverst.

---

### 4. Bekreft

Modal vises: "Er du sikker? Dette lukker ALLE åpne trades umiddelbart."

Skriv "JA, LUKK ALT" og klikk bekreft.

---

### 5. Verifiser

- Robot-status skal vise: 🔴 Stopped
- Alle posisjoner skal være lukket
- Ingen nye trades skal åpnes

---

### 6. Analyser logs

Se logs-tabellen på samme side:

- Hvilke trades ble lukket?
- Hva var P&L?
- Hva var siste strategi-signal?

---

### 7. Postmortem

Skriv kort analyse:

- Hvorfor måtte robot stoppes?
- Hva var feilen (strategi, risk management, bug)?
- Hvordan fikse før restart?

---

## Kontakt

- Taj: taj@klarpakke.no
- Emergency: +47 XXX XX XXX
