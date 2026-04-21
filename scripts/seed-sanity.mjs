/**
 * seed-sanity.mjs
 * Oppretter startdokumenter for Sanity singletons og eksempel-innhold.
 * Kjør: node scripts/seed-sanity.mjs
 */
import { createClient } from '@sanity/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Last .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-04-07',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

const SINGLETON_ID_LANDING = 'landingContent'
const SINGLETON_ID_TOKENS  = 'designTokens'

async function upsert(doc) {
  const existing = await client.getDocument(doc._id)
  if (existing) {
    console.log(`  ⏭️  Finnes allerede: ${doc._id}`)
    return
  }
  await client.createOrReplace(doc)
  console.log(`  ✅  Opprettet: ${doc._id}`)
}

async function main() {
  console.log('\n🌱 Klarpakke Sanity Seed\n')

  // ─── Singleton: Landingsside ────────────────────────────────────
  await upsert({
    _id: SINGLETON_ID_LANDING,
    _type: 'landingContent',
    language: 'no',
    heroTitle: {
      line1: 'Automatisk kryptohandel',
      line2: 'for norske sparere',
    },
    heroSubtitle: 'La boten handle mens du sover. Koble til Coinbase og start på 5 minutter.',
    heroCta: {
      text: 'Kom i gang gratis',
      link: '/no/signup',
    },
    trustBadges: [
      { icon: '🔒', text: 'Coinbase-sertifisert' },
      { icon: '⚡', text: 'Under 5 min oppsett' },
      { icon: '📊', text: 'Historiske data 2019–2024' },
    ],
    socialProof: {
      headline: 'Brukt av norske sparere',
      stats: [
        { value: '2 400+', label: 'Brukere', icon: 'Users' },
        { value: '98%', label: 'Oppetid', icon: 'Server' },
        { value: '24/7', label: 'Automatisk', icon: 'Zap' },
      ],
      perks: [
        {
          icon: 'TrendingUp',
          title: 'Automatisert handel',
          description: 'Boten handler for deg døgnet rundt basert på din strategi.',
          color: 'from-blue-500 to-indigo-600',
        },
        {
          icon: 'Shield',
          title: 'Risikostyring',
          description: 'Stop-loss, maks dagstap og eksponering styres automatisk.',
          color: 'from-green-500 to-emerald-600',
        },
        {
          icon: 'BarChart3',
          title: 'Backtest',
          description: 'Test strategier mot historiske data før du investerer.',
          color: 'from-purple-500 to-pink-600',
        },
      ],
    },
    pricingHeader: {
      title: 'Enkel prising',
      subtitle: 'Start gratis. Oppgrader når du er klar.',
    },
    features: [
      { icon: '🤖', title: 'AI-strategi', description: 'Maskinlæring velger optimale inn- og ut-punkter.' },
      { icon: '💰', title: 'NOK-basert', description: 'Alt vises i norske kroner. USDT/NOK-kurs oppdateres daglig.' },
      { icon: '📈', title: 'Live dashboard', description: 'Se porteflølje, handler og signaler i sanntid.' },
    ],
  })

  // ─── Singleton: Design Tokens ─────────────────────────────────────
  await upsert({
    _id: SINGLETON_ID_TOKENS,
    _type: 'designTokens',
    title: 'Klarpakke Design Tokens',
    isActive: false,
    lastUpdated: new Date().toISOString(),
  })

  // ─── FAQ-eksempler ───────────────────────────────────────────────
  const faqs = [
    {
      _id: 'faq-hva-er-klarpakke',
      question: 'Hva er Klarpakke?',
      answer: [{ _type: 'block', _key: 'a1', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 's1', text: 'Klarpakke er en norsk SaaS-plattform som automatiserer kryptohandel via Coinbase. Du setter opp din strategi og risikogrense — boten gjør resten.' }] }],
      category: 'general',
      language: 'no',
      order: 1,
    },
    {
      _id: 'faq-trygt',
      question: 'Er det trygt å koble til Coinbase?',
      answer: [{ _type: 'block', _key: 'a2', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 's2', text: 'Vi bruker kun API-nøkler med handels-tillatelse — aldri uttak. Nøklene lagres kryptert og du kan trekke dem tilbake når som helst.' }] }],
      category: 'security',
      language: 'no',
      order: 2,
    },
    {
      _id: 'faq-koster',
      question: 'Hva koster det?',
      answer: [{ _type: 'block', _key: 'a3', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 's3', text: 'Grunnplanen er gratis med papirhandel. Autotrade krever et betalt abonnement — se prissiden for detaljer.' }] }],
      category: 'billing',
      language: 'no',
      order: 3,
    },
  ]

  for (const faq of faqs) {
    await upsert({ ...faq, _type: 'faq' })
  }

  console.log('\n✨ Seed fullført! Åpne Studio: https://www.klarpakke.no/studio\n')
}

main().catch((err) => {
  console.error('❌ Seed feilet:', err.message)
  process.exit(1)
})
