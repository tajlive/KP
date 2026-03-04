/**
 * Environment Variables Validation
 * Sjekker at alle nødvendige miljøvariabler er satt
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'STRIPE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const optionalEnvVars = [
  'RESEND_API_KEY',
  'CRON_SECRET',
]

console.log('=== Environment Variables Validation ===\n')

let allRequiredPresent = true
let allOptionalPresent = true

console.log('Required variables:')
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`  ❌ Missing: ${envVar}`)
    allRequiredPresent = false
  } else {
    const value = process.env[envVar]!
    const displayValue = value.length > 20 
      ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
      : value
    console.log(`  ✅ Present: ${envVar} = ${displayValue}`)
  }
}

console.log('\nOptional variables:')
for (const envVar of optionalEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`  ⚠️  Missing: ${envVar}`)
    allOptionalPresent = false
  } else {
    console.log(`  ✅ Present: ${envVar}`)
  }
}

console.log('\n' + '='.repeat(50))

if (!allRequiredPresent) {
  console.error('❌ Some required environment variables are missing!')
  process.exit(1)
}

if (!allOptionalPresent) {
  console.warn('⚠️  Some optional environment variables are missing')
}

console.log('✅ All required environment variables are set')
process.exit(0)
