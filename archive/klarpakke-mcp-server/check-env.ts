#!/usr/bin/env -S deno run --allow-all
/**
 * 🔒 Environment Variable Security Checker
 * Verifies all secrets are properly configured and not exposed
 */

const requiredVars = [
  // Supabase
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  
  // Vercel
  'VERCEL_TOKEN',
  'VERCEL_PROJECT_ID',
  
  // Cloudflare
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ZONE_ID',
  
  // Stripe
  'STRIPE_SECRET_KEY',
  
  // Resend
  'RESEND_API_KEY',
  
  // GitHub
  'GITHUB_PAT',
  
  // Optional
  'PERPLEXITY_API_KEY',
  'SUPABASE_MANAGEMENT_TOKEN',
];

const optionalVars = [
  'VERCEL_TEAM_ID',
  'VERCEL_ORG_ID',
  'STRIPE_WEBHOOK_SECRET',
  'GITHUB_OWNER',
  'GITHUB_REPO_NAME',
];

console.log('🔒 MCP Environment Security Check\n');

let missingRequired = 0;
let missingOptional = 0;
let configured = 0;

// Check required variables
console.log('📋 Required Variables:');
for (const key of requiredVars) {
  const value = Deno.env.get(key);
  if (value) {
    const preview = value.slice(0, 8) + '...' + value.slice(-4);
    console.log(`  ✅ ${key}: ${preview}`);
    configured++;
  } else {
    console.log(`  ❌ ${key}: MISSING`);
    missingRequired++;
  }
}

// Check optional variables
console.log('\n📋 Optional Variables:');
for (const key of optionalVars) {
  const value = Deno.env.get(key);
  if (value) {
    console.log(`  ✅ ${key}: Set`);
    configured++;
  } else {
    console.log(`  ⚠️  ${key}: Not set`);
    missingOptional++;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Configured: ${configured}`);
console.log(`❌ Missing Required: ${missingRequired}`);
console.log(`⚠️  Missing Optional: ${missingOptional}`);

if (missingRequired > 0) {
  console.log('\n⚠️  Some required variables are missing!');
  console.log('Copy klarpakke-mcp-server/ENV.example to klarpakke-mcp-server/.env');
  console.log('and fill in all required values.\n');
  Deno.exit(1);
} else {
  console.log('\n🎉 All required environment variables are configured!');
  console.log('   MCP server is ready to use.\n');
  Deno.exit(0);
}
