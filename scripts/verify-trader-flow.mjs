#!/usr/bin/env node
/**
 * 🔍 Verifiserings-script for "Trader" + "Lekepenger" funksjonalitet
 * Kjør selv for å sjekke at alt fungerer på din konto
 * 
 * Bruk: node scripts/verify-trader-flow.mjs [din-email]
 */

const CHECKLIST = {
  // Scenario 1: Første gang trader
  "S1: Dashboard viser 'Start øvingshandel'": {
    path: "/no/dashboard",
    check: ["Lekepenger", "Start øvingshandel"],
    notCheck: ["Paper Trading", "toasts.paperBot"]
  },
  
  // Scenario 2: BotWizard
  "S2: BotWizard viser riktige tekster": {
    path: "/no/dashboard/auto-trade",
    check: ["Lekepenger", "Start trader"],
    notCheck: ["Paper bot"]
  },
  
  // Scenario 3: i18n - ingen råe nøkler
  "S3: Ingen MISSING_MESSAGE feil": {
    path: "/no/dashboard",
    check: [],
    consoleCheck: ["MISSING_MESSAGE", "toasts.paperBot"]
  },
  
  // Scenario 4: Toast-meldinger
  "S4: Toast-tekster på norsk": {
    check: [
      "Kunne ikke starte boten",
      "Grense for antall tradere nådd",
      "Allerede aktiv"
    ]
  }
};

console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🔍 Verifisering av "Trader" + "Lekepenger" funksjonalitet ║
╚═══════════════════════════════════════════════════════════╝

Denne sjekklisten hjelper deg å verifisere at alt fungerer korrekt.

📋 Manuell Sjekkliste:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  GÅ TIL: https://www.klarpakke.no/no/dashboard

   ✅ Se etter:
      □ "Lekepenger" (ikke "Paper Trading")
      □ "Start øvingshandel" CTA (hvis ingen aktive tradere)
      □ Ingen [MISSING: ...] tekster

2️⃣  GÅ TIL: https://www.klarpakke.no/no/dashboard/auto-trade

   ✅ Se etter:
      □ "Lekepenger" i stedet for "Paper Trading"
      □ "Start trader" knapp
      □ Riktige strategi-valg

3️⃣  TEST: Opprett en trader (hvis du har < 3 aktive)

   ✅ Verifiser toast:
      □ "Øvingsbot startet!" (ikke "Paper bot startet!")
      □ "Boten din handler nå med lekepenger."

4️⃣  TEST: Prøv å opprette duplikat trader

   ✅ Verifiser feilmelding:
      □ "Allerede aktiv"
      □ "Du har allerede en bot som kjører..."

5️⃣  TEST: Prøv å overstige grensen (hvis du har 3 aktive)

   ✅ Verifiser feilmelding:
      □ "Grense for antall tradere nådd"
      □ "Du kan ha maks {max} aktive tradere..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐛 Feilsøking:

Hvis du ser "Paper Trading" eller "[MISSING:":
→ Sjekk at du bruker /no/ (norsk) URL
→ Hard refresh: Ctrl+Shift+R (Windows) eller Cmd+Shift+R (Mac)
→ Sjekk console for i18n-feil

Hvis toast-meldinger vises på engelsk:
→ Rapporter til KIMI med skjermbilde
→ Inkluder URL og hva du gjorde

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Rapporter funn:

Send resultater til MemPalace:
  ./scripts/mempalace-diary-v2.sh write TEST \
    "Verifiserte trader+lekepenger: [antall] tester OK" \
    GO "★★★★" 5
`);

// Sjekk produksjons-versjon
async function checkProduction() {
  console.log("\n🌐 Sjekker produksjonsversjon...\n");
  
  try {
    const response = await fetch("https://www.klarpakke.no/api/health");
    const data = await response.json();
    console.log(`   Versjon: ${data.version}`);
    console.log(`   Status: ${data.status}`);
    
    if (data.version.includes("a8df8d1") || data.version.includes("234d83b") || data.version.includes("9979218")) {
      console.log("   ✅ Versjon inkluderer 'lekepenger'-fikser");
    } else {
      console.log("   ⚠️  Eldre versjon - kan mangle noen fikser");
    }
  } catch (e) {
    console.log("   ❌ Kunne ikke kontakte produksjon");
  }
}

checkProduction();

console.log(`

✨ Tips: Bruk denne kommandoen for å sjekke i18n i sanntid:
   node scripts/agent-bridge.mjs dashboard

📚 Se også:
   cat .knowledge/i18n/toasts-common-json.md
`);
