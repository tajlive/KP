#!/usr/bin/env node
/**
 * Sjekker Sentry for auth-relaterte feil
 * Bruker Sentry MCP hvis tilgjengelig
 */

import { execSync } from 'child_process';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

async function checkSentryAuth() {
  console.log('🔍 Sjekker auth-feil i Sentry...\n');
  
  // Prøv å hente fra Sentry API via MCP
  try {
    // Sjekk om vi har sentry-cli
    const hasSentryCLI = await new Promise(resolve => {
      try {
        execSync('which sentry-cli', { stdio: 'ignore' });
        resolve(true);
      } catch {
        resolve(false);
      }
    });
    
    if (hasSentryCLI && process.env.SENTRY_AUTH_TOKEN) {
      console.log('Henter siste issues fra Sentry...\n');
      
      const output = execSync(
        'sentry-cli issues list --query "auth OR login OR session OR oauth" --limit 10',
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      
      if (output.trim()) {
        console.log(output);
      } else {
        console.log('Ingen auth-feil funnet i Sentry ✓');
      }
    } else {
      console.log('📊 Manual Sentry Check:');
      console.log('=======================\n');
      console.log('URL: https://klarpakke.sentry.io/issues/');
      console.log('Søk: is:unresolved auth login session cookie\n');
      
      // Sjekk om vi kan lese build logs
      console.log('📝 Siste kjente auth-problemer:');
      console.log('-------------------------------');
      console.log('1. React Hydration Error #418 under OAuth callback');
      console.log('2. Session blir ikke beholdt etter redirect til dashboard');
      console.log('3. Mulig cookie domain mismatch (www vs non-www)\n');
    }
    
    // Anbefalinger
    console.log('💡 Anbefalinger for auth-debugging:');
    console.log('====================================');
    console.log('');
    console.log('1. Bruk Chrome DevTools:');
    console.log('   - F12 → Network → Preserve log');
    console.log('   - Filtrer på "callback" og "session"');
    console.log('   - Sjekk Set-Cookie headers');
    console.log('');
    console.log('2. Sjekk Application → Cookies:');
    console.log('   - sb-access-token skal ha Domain: .klarpakke.no');
    console.log('   - sb-refresh-token skal ha Domain: .klarpakke.no');
    console.log('   - Begge må ha SameSite=None; Secure');
    console.log('');
    console.log('3. Test med curl:');
    console.log('   curl -I "https://www.klarpakke.no/no/auth/callback?code=test"');
    console.log('');
    
  } catch (error) {
    console.log('Kunne ikke koble til Sentry:', error.message);
  }
}

checkSentryAuth();
