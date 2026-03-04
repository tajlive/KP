const fs = require('fs');
const path = require('path');

// Les begge språkfilene
const en = JSON.parse(fs.readFileSync('./messages/en.json', 'utf8'));
const no = JSON.parse(fs.readFileSync('./messages/no.json', 'utf8'));

// Funksjon for å sammenligne nøkler
function compareKeys(obj1, obj2, prefix = '') {
  const missing = [];
  
  for (const key in obj1) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj1[key] === 'object' && obj1[key] !== null) {
      if (!obj2[key]) {
        missing.push({ key: fullKey, reason: 'Mangler i no.json' });
      } else {
        missing.push(...compareKeys(obj1[key], obj2[key], fullKey));
      }
    } else {
      if (!obj2[key]) {
        missing.push({ key: fullKey, reason: 'Mangler i no.json' });
      }
    }
  }
  
  // Sjekk om no.json har ekstra nøkler
  for (const key in obj2) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!obj1[key]) {
      missing.push({ key: fullKey, reason: 'Ekstra i no.json (ikke i en.json)' });
    }
  }
  
  return missing;
}

console.log('=== OVERSSETTELSES-RAPPORT ===\n');

const missing = compareKeys(en, no);

if (missing.length === 0) {
  console.log('✅ Alle nøkler er synkronisert mellom en.json og no.json\n');
} else {
  console.log(`⚠️  Fant ${missing.length} forskjeller:\n`);
  missing.forEach(m => {
    console.log(`  ${m.reason}: ${m.key}`);
  });
}

// Sjekk etter engelske tekster i koden
console.log('\n=== KOMPONENTER MED HARDCODED TEKST ===\n');
console.log('Sjekker...');
