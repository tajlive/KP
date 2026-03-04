#!/usr/bin/env node
const { execSync } = require('child_process');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'oysfdzutvezqhainaxba';
const SUPABASE_URL = 'https://' + PROJECT_REF + '.supabase.co';

console.log('🔄 Stripe Products Sync\n');

function main() {
  try {
    // Sjekk om Supabase CLI er installert
    try {
      execSync('which supabase', { stdio: 'ignore' });
    } catch {
      console.error('❌ Supabase CLI ikke funnet. Installer med:');
      console.error('   npm install -g supabase');
      process.exit(1);
    }

    // 1. Link til prosjektet
    console.log('1️⃣  Linker til Supabase prosjekt...');
    try {
      execSync('supabase link --project-ref ' + PROJECT_REF, { 
        stdio: 'inherit',
        env: { ...process.env }
      });
    } catch (e) {
      console.log('   ℹ️  Allerede linket eller ignorerer feil');
    }

    // 2. Kjør migrasjoner
    console.log('\n2️⃣  Kjører database migrasjoner...');
    execSync('supabase db push', { 
      stdio: 'inherit',
      env: { ...process.env }
    });

    // 3. Deploy Edge Function
    console.log('\n3️⃣  Deployer Edge Function...');
    execSync('supabase functions deploy stripe-products', { 
      stdio: 'inherit',
      env: { ...process.env }
    });

    // 4. Info
    console.log('\n4️⃣  Synker med Stripe...');
    console.log('   💡 For å trigge sync, kjør:');
    const curlCmd = [
      'curl -X POST ' + SUPABASE_URL + '/functions/v1/stripe-products/sync',
      '  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"'
    ].join(' \\\n');
    console.log('   ' + curlCmd);

    console.log('\n✅ Setup fullført!');

  } catch (error) {
    console.error('\n❌ Feil:', error.message);
    process.exit(1);
  }
}

main();
