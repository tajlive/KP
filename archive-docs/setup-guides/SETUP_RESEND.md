# Resend SMTP - Komplett Oppskrift

## 🇳🇴 For epost-bekreftelser og Magic Link

### Steg 1: Verifiser domene
1. Gå til https://resend.com/domains
2. Klikk "Add domain"
3. Skriv: `klarpakke.no`
4. Kopier DNS records (DKIM, SPF)

### Steg 2: Legg til DNS Records
1. Gå til din DNS-leverandør (der du kjøpte klarpakke.no)
2. Legg til disse records:

**Type: TXT** (DKIM)
- **Name**: `resend._domainkey`
- **Value**: (kopier fra Resend)

**Type: TXT** (SPF)
- **Name**: `@`
- **Value**: `v=spf1 include:resend.com ~all`

3. Vent på verifisering (5-60 minutter)

### Steg 3: Hent API Key
1. Resend → API Keys
2. "Create API Key"
3. **Name**: `Klarpakke Production`
4. **Permission**: `Sending access`
5. Kopier key (starter med `re_`)

### Steg 4: Konfigurer Supabase SMTP
1. https://app.supabase.com/project/_/auth/providers
2. Finn "Email" (øverst)
3. Slå på "Enable Custom SMTP"
4. Fyll ut:
   - **Host**: `smtp.resend.com`
   - **Port**: `587`
   - **Username**: `resend`
   - **Password**: `re_din_api_key_her`
   - **Sender name**: `Klarpakke Universitet`
   - **Sender email**: `noreply@klarpakke.no`
5. Klikk **Save**

### Steg 5: Test
1. Registrer ny test-bruker
2. Sjekk at epost kommer frem
3. Sjekk at lenken fungerer

✅ FERDIG!

---

## 🇬🇧 English Guide

Same steps, use English interface in Resend.

---

## 🚨 FEILSØKING / TROUBLESHOOTING

| Problem | Løsning / Solution |
|---------|-------------------|
| Epost i spam | Sjekk at DKIM/SPF er riktig |
| "Verification failed" | Vent lenger (opptil 24t for DNS) |
| "Invalid credentials" | Sjekk at API key har "Sending" permission |
| Epost kommer ikke | Sjekk at Custom SMTP er ON i Supabase |

---

## ✅ SJEKKLISTE / CHECKLIST

- [ ] Domene verifisert i Resend
- [ ] DNS records lagt til
- [ ] API key kopiert
- [ ] Supabase SMTP konfigurert
- [ ] Test-epost sendt og mottatt
