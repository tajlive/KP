/**
 * TEST AV E-POST KAMPANJE SYSTEM
 * 
 * Kjør: node scripts/email-campaign/test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

console.log('🧪 TESTER E-POST KAMPANJE SYSTEM\n');

// Test 1: Sjekk environment
console.log('1️⃣  Sjekker environment...');
const requiredEnv = ['RESEND_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
let allEnvOk = true;
for (const env of requiredEnv) {
  const exists = process.env[env];
  console.log(`   ${exists ? '✅' : '❌'} ${env}`);
  if (!exists) allEnvOk = false;
}

// Test 2: Sjekk filer
console.log('\n2️⃣  Sjekker filer...');
const requiredFiles = [
  'scripts/email-campaign/index.ts',
  'scripts/email-campaign/setup.sql',
  'scripts/email-campaign/LINKEDIN_EXPORT_GUIDE.md',
  'src/app/api/track/open/route.ts',
  'src/app/api/track/click/route.ts',
];
for (const file of requiredFiles) {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
}

// Test 3: CSV parsing
console.log('\n3️⃣  Tester CSV parsing...');
const sampleCSV = `First Name,Last Name,Email,Company,Position
Ola,Nordmann,ola@example.com,Acme AS,Utvikler
Kari,Nordmann,kari@test.com,Test AS,Selger`;

try {
  const records = parse(sampleCSV, { columns: true, skip_empty_lines: true });
  console.log(`   ✅ CSV parsing fungerer (${records.length} rader)`);
} catch (e) {
  console.log(`   ❌ CSV parsing feilet: ${e}`);
}

// Test 4: Resend import
console.log('\n4️⃣  Tester Resend...');
try {
  const { Resend } = require('resend');
  console.log('   ✅ Resend modul funnet');
} catch (e) {
  console.log('   ❌ Resend ikke installert');
}

// Oppsummering
console.log('\n' + '='.repeat(50));
if (allEnvOk) {
  console.log('✅ KLAR TIL BRUK!');
  console.log('\nNeste steg:');
  console.log('  1. Kjør SQL i Supabase: scripts/email-campaign/setup.sql');
  console.log('  2. Eksporter LinkedIn CSV');
  console.log('  3. Kjør: node scripts/email-campaign/index.ts --import linkedin.csv');
  console.log('  4. Kjør: node scripts/email-campaign/index.ts --send');
} else {
  console.log('❌ Mangler environment variables');
  console.log('\nLegg til i .env.local:');
  console.log('  RESEND_API_KEY=re_xxxxxxxxxxxx');
  console.log('  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=eyJ...');
}
console.log('='.repeat(50));
