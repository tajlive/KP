# Stripe Manuell Oppsett - Klarpakke

## 🎯 Hva vi skal lage

### Produkter & Priser:

| Produkt | Type | Pris | MVA |
|---------|------|------|-----|
| **Krypto for Småsparere** | Kurs (engang) | 999 kr | 25% |
| **Krypto for Småsparere** | Kurs (abonnement) | 299 kr/mnd | 25% |
| **Trading Masterclass** | Kurs (engang) | 1,499 kr | 25% |
| **Trading Masterclass** | Kurs (abonnement) | 399 kr/mnd | 25% |
| **VIP Basic** | Medlemskap | 199 kr/mnd | 25% |
| **VIP Pro** | Medlemskap | 499 kr/mnd | 25% |
| **VIP Ekstrem** | Medlemskap | 999 kr/mnd | 25% |

---

## 📋 Steg-for-steg instruksjoner

### Del 1: Sette opp skatt (MVA)

1. Gå til https://dashboard.stripe.com/settings/tax
2. Klikk "Add tax rate"
3. Fyll ut:
   - **Display name:** MVA Norge
   - **Percentage:** 25
   - **Country:** Norway
   - **Tax type:** VAT
4. Klikk "Save"

### Del 2: Opprette Produkter

#### Produkt 1: Krypto for Småsparere

1. Gå til https://dashboard.stripe.com/products
2. Klikk "+ Add product"
3. Fyll ut:
   - **Name:** Krypto for Småsparere
   - **Description:** Fra 0 til trygg investor på 4 uker. Lær Bitcoin, sikkerhet og sparing.
   - **Image:** (Last opp kurs thumbnail)
   
4. Under "Pricing" klikk "+ Add another price":

   **Pris 1 - Engangsbetaling:**
   - **Price:** 999
   - **Currency:** NOK
   - **Pricing model:** Standard pricing
   
   **Pris 2 - Abonnement:**
   - **Price:** 299
   - **Currency:** NOK
   - **Pricing model:** Recurring
   - **Billing period:** Monthly
   
5. Velg "MVA Norge (25%)" under Tax rate
6. Klikk "Save product"

#### Produkt 2: Trading Masterclass

1. Klikk "+ Add product"
2. Fyll ut:
   - **Name:** Trading Masterclass
   - **Description:** Avanserte strategier for erfarne tradere.

3. Legg til priser:
   
   **Pris 1 - Engangsbetaling:**
   - **Price:** 1,499
   - **Currency:** NOK
   - **Standard pricing**
   
   **Pris 2 - Abonnement:**
   - **Price:** 399
   - **Currency:** NOK
   - **Recurring / Monthly**

4. Velg MVA 25%
5. Klikk "Save"

#### Produkt 3: VIP Medlemskap

**VIP Basic:**
- Name: "VIP Basic Medlemskap"
- Price: 199 NOK / måned
- Recurring: Monthly

**VIP Pro:**
- Name: "VIP Pro Medlemskap"
- Price: 499 NOK / måned
- Recurring: Monthly

**VIP Ekstrem:**
- Name: "VIP Ekstrem Medlemskap"
- Price: 999 NOK / måned
- Recurring: Monthly

---

### Del 3: Kopiere Price IDs

Vi trenger Price IDs for å integrere med koden:

1. Gå til https://dashboard.stripe.com/products
2. Klikk på hvert produkt
3. Under "Pricing" finner du Price ID (starter med `price_`)

**Lagre disse i `.env.local`:**

```bash
# Kurs - Engangsbetaling
NEXT_PUBLIC_PRICE_CRYPTO_COURSE=price_xxx
NEXT_PUBLIC_PRICE_TRADING_COURSE=price_xxx

# Kurs - Abonnement
NEXT_PUBLIC_PRICE_CRYPTO_SUB=price_xxx
NEXT_PUBLIC_PRICE_TRADING_SUB=price_xxx

# VIP Medlemskap
NEXT_PUBLIC_PRICE_VIP_BASIC=price_xxx
NEXT_PUBLIC_PRICE_VIP_PRO=price_xxx
NEXT_PUBLIC_PRICE_VIP_EXTREME=price_xxx
```

---

## 🧪 Testing

### Test i Test Mode:

1. Bytt til "Test mode" i Stripe (toggle oppe til høyre)
2. Bruk testkort: `4242 4242 4242 4242`
3. Eksperi-dato: Hvilken som helst fremtidig dato
4. CVC: Hvilken som helst 3-sifret

---

## 🚀 Aktivere Live Mode

1. Når alt er testet OK, bytt til "Live mode"
2. Gjenta stegene ovenfor
3. Kopier nye Price IDs (de er annerledes i live mode!)
4. Oppdater `.env.local` med live keys:

```bash
# Bytt fra:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Til:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

---

## 📸 Screenshots nødvendig?

Jeg kan lage screenshots av:
- ✅ Hvordan "Add product" ser ut
- ✅ Hvor Price ID finnes
- ✅ Hvordan sette opp abonnement
- ✅ Test kort bruk

**Si ifra hvis du vil ha screenshots!** 📸

---

## ❓ Hjelp

Stuck? Send meg:
1. Hvilket steg du er på
2. Hva som går galt
3. Eventuell feilmelding

Så hjelper jeg deg videre! 💪
