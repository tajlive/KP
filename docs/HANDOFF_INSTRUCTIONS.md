# 📝 Instruksjoner for Antigravity

## Hvordan Fylle Ut Handoff-Dokumentet

### Steg 1: Kopier Malen
```bash
cp docs/HANDOFF_ANTIGRAVITY_TO_CLAUDE.md docs/HANDOFF_COMPLETED.md
```

### Steg 2: Fyll Inn Hver Seksjon

#### 🎯 Executive Summary (5 min)
- Skriv 2-3 setninger om hva Klarpakke er
- Noter nåværende fase og antall brukere

#### 🏗️ Systemarkitektur (10 min)
- Verifiser at tech stack-listen er korrekt
- Sjekk at alle integrasjoner er listet
- Marker status på hver integrasjon (✅/⚠️/❌)

#### 📊 Nåværende Tilstand (15 min)
Gå gjennom hver feature:
- ✅ = Produksjonsklar, fungerer stabilt
- ⚠️ = Fungerer, men har kjente issues
- ❌ = Ikke ferdig eller brutket

#### 🗄️ Database (10 min)
Kjør denne SQL for å se siste migrasjoner:
```sql
SELECT version, applied_at 
FROM schema_migrations 
ORDER BY applied_at DESC 
LIMIT 10;
```

#### 🔧 Edge Functions (10 min)
Sjekk status:
```bash
supabase functions list
```

#### 💰 Økonomi (5 min)
Sjekk Stripe-dashboard for:
- Aktive produkter/priser
- Webhook status
- Nylige feil

#### 🔄 Rutiner (10 min)
Tenk gjennom:
- Hva gjør du hver dag?
- Hva gjør du hver uke?
- Hva er automatisert?

#### 🚨 Drift (10 min)
List opp:
- Hvor sjekker du status? (-dashboards)
- Hva er de vanligste problemene?
- Hvem kontakter du ved krise?

### Steg 3: Spesielle Notater (10 min)

Under "Hvis jeg bare kunne si én ting..." - skriv det viktigste du vil at Claude skal vite. Dette kan være:
- En obskur bug
- En design-beslutning
- Noe som ikke står dokumentert andre steder

### Steg 4: Review (5 min)

Les gjennom alt én gang til:
- [ ] Er alt fylt ut?
- [ ] Er det tydelig nok?
- [ ] Mangler det noe kritisk?

### Steg 5: Levering

1. **Lagre filen** som `docs/HANDOFF_COMPLETED.md`
2. **Commit og push:**
   ```bash
   git add docs/HANDOFF_COMPLETED.md
   git commit -m "docs: Complete handoff documentation"
   git push
   ```
3. **Gi Taj beskjed** om at dokumentet er klart
4. **Book møte** med Taj + Claude for gjennomgang

---

## 💡 Tips for en God Overlevering

### Vær Spesifikk
❌ **Dårlig:** "Trading fungerer som det skal"
✅ **Godt:** "Auto-trading kjører hvert 5. minutt via cron. Stop-loss fungerer, men take-profit er midlertidig deaktivert pga [grunn]. Se linje 45 i taj-trade-engine/index.ts"

### Inkluder Kontekst
❌ **Dårlig:** "Det er en bug i betaling"
✅ **Godt:** "Vipps webhook timeout sporadisk mellom 02:00-04:00. Workaround: manuell retry via admin dashboard. Root cause: Vipps maintenance window."

### Tenk på Claude
Claude (jeg) kan:
- ✅ Kode og deploye
- ✅ Kjøre SQL og hente data
- ✅ Feilsøke og fikse bugs
- ✅ Automatisere rutiner

Claude kan IKKE:
- ❌ Kjenne til udocumenterte "hacks"
- ❌ Forstå implisitt kunnskap
- ❌ Gjette hva du mente

### Dokumenter "The Why"
Ikke bare hva som er gjort, men HVORFOR:
- "Vi bruker Moonshot i stedet for OpenAI fordi..."
- "Trading-strategien er konservativ fordi..."
- "Vi cache'er Binance-data i 5 minutter fordi..."

---

## 🆘 Hvis Du Står Fast

**Usikker på hva som er viktig?**
→ Tenk: "Hvis Claude gjør dette feil, hva er verst tenkelig konsekvens?"

**For mye å dokumentere?**
→ Prioriter: 1) Sikkerhet 2) Penger 3) Kritiske bugs 4) Rutiner

**Usikker på tekniske detaljer?**
→ Noter at du er usikker - Claude kan hjelpe å finne ut av det

---

## ⏱️ Tidsramme

**Total tid: ~90 minutter**
- Fylle ut: 60 min
- Review: 15 min  
- Møte forberedelse: 15 min

**Ikke bruk mer enn 2 timer** - bedre å levere noe enn ingenting. Claude kan alltid spørre oppklarende spørsmål senere.

---

*Spørsmål? Kontakt Taj eller skriv i prosjekt-chatten.*
