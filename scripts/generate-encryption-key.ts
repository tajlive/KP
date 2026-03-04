import { generateEncryptionKey } from '../src/lib/crypto/encrypt-api-keys'

async function main() {
  try {
    const key = await generateEncryptionKey()
    console.log('\n🔑 ENCRYPTION_KEY generert:\n')
    console.log(key)
    console.log('\n⚠️  VIKTIG:')
    console.log('1. Kopier nøkkelen over')
    console.log('2. Legg til i .env.local (for lokal testing):')
    console.log(`   ENCRYPTION_KEY=${key}`)
    console.log('3. Legg til i Vercel:')
    console.log('   vercel env add ENCRYPTION_KEY production')
    console.log('4. ALDRI commit denne nøkkelen til Git!\n')
  } catch (error) {
    console.error('❌ Feil ved generering:', error)
    process.exit(1)
  }
}

main()
