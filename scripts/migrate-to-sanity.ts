/**
 * Migration script to move hardcoded content to Sanity CMS
 * 
 * Usage:
 * 1. Set up Sanity project: https://www.sanity.io/manage
 * 2. Add PROJECT_ID to .env.local
 * 3. Get WRITE token from Sanity dashboard
 * 4. Run: npx ts-node scripts/migrate-to-sanity.ts
 */

import { createClient } from '@sanity/client';

// Configuration
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '';
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const TOKEN = process.env.SANITY_API_WRITE_TOKEN || ''; // You need to create this

if (!PROJECT_ID || !TOKEN) {
  console.error('❌ Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SANITY_PROJECT_ID');
  console.error('  - SANITY_API_WRITE_TOKEN');
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-04-07',
  token: TOKEN,
  useCdn: false,
});

// =============================================================================
// DATA TO MIGRATE
// =============================================================================

const landingContentNo = {
  _type: 'landingContent',
  language: 'no',
  heroTitle: {
    line1: 'Lær å trade krypto',
    line2: 'med AI som mentor',
  },
  heroSubtitle: 'Fra nybegynner til proff med papirhandel, AI-analyse og automatisk trading. Gratis å starte.',
  heroCta: {
    text: 'Start gratis',
    link: '/register',
  },
  trustBadges: [
    { text: 'Alltid gratis å prøve', icon: '✓' },
    { text: 'Ingen kort påkrevd', icon: '✓' },
    { text: 'Kanseller når som helst', icon: '✓' },
  ],
  features: [
    {
      title: 'Paper Trading',
      description: 'Øv med lekepenger før du trader med ekte penger',
      icon: '🎮',
    },
    {
      title: 'AI-Analyse',
      description: 'Få intelligente innsikter og anbefalinger',
      icon: '🤖',
    },
    {
      title: 'Auto-Trading',
      description: 'La strategiene handle automatisk for deg',
      icon: '⚡',
    },
  ],
};

const landingContentEn = {
  _type: 'landingContent',
  language: 'en',
  heroTitle: {
    line1: 'Learn to trade crypto',
    line2: 'with AI as your mentor',
  },
  heroSubtitle: 'From beginner to pro with paper trading, AI analysis, and automated trading. Free to start.',
  heroCta: {
    text: 'Start free',
    link: '/register',
  },
  trustBadges: [
    { text: 'Always free to try', icon: '✓' },
    { text: 'No card required', icon: '✓' },
    { text: 'Cancel anytime', icon: '✓' },
  ],
  features: [
    {
      title: 'Paper Trading',
      description: 'Practice with play money before trading real funds',
      icon: '🎮',
    },
    {
      title: 'AI Analysis',
      description: 'Get intelligent insights and recommendations',
      icon: '🤖',
    },
    {
      title: 'Auto-Trading',
      description: 'Let strategies trade automatically for you',
      icon: '⚡',
    },
  ],
};

const strategies = [
  {
    _type: 'strategy',
    name: 'DCA Trygg',
    slug: { _type: 'slug', current: 'dca-trygg' },
    description: 'Kjøper BTC/ETH automatisk hver uke. Dobler ved store dip.',
    longDescription: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'DCA (Dollar Cost Averaging) er en strategi der du kjøper for faste beløp med jevne mellomrom. Dette reduserer risikoen for å kjøpe på toppen av markedet.',
          },
        ],
      },
    ],
    riskLevel: 1,
    indicators: ['DCA', 'Auto-buy', 'Dip-buying'],
    icon: '📊',
    color: 'blue',
    stopLoss: -5,
    takeProfit: 10,
    isActive: true,
  },
  {
    _type: 'strategy',
    name: 'Trend Balansert',
    slug: { _type: 'slug', current: 'trend-balansert' },
    description: 'Følger MA50/MA200 crossover med RSI-filter.',
    riskLevel: 3,
    indicators: ['MA50', 'MA200', 'RSI'],
    icon: '📈',
    color: 'green',
    stopLoss: -8,
    takeProfit: 15,
    isActive: true,
  },
  {
    _type: 'strategy',
    name: 'Grid Bot',
    slug: { _type: 'slug', current: 'grid-bot' },
    description: 'Kjøper lavt, selger høyt i prisgitter.',
    riskLevel: 3,
    indicators: ['Grid', 'Range'],
    icon: '⚡',
    color: 'purple',
    stopLoss: -10,
    takeProfit: 12,
    isActive: true,
  },
];

const tradeExplanations = [
  {
    _type: 'tradeExplanation',
    strategyKey: 'dca_smart',
    language: 'no',
    buyExplanation: 'Vi kjøpte fordi markedet var i en god kjøpsfase ifølge vår Smart DCA-strategi. Ved å kjøpe litt og litt når prisen er lav, bygger du posisjon gradvis uten å prøve å time markedet perfekt.',
    sellExplanation: 'Vi solgte for å sikre en gevinst. Strategien vurderte at risikoen for tilbakeslag nå oversteg potensialet for videre oppgang.',
    stopLossExplanation: 'Vi solgte fordi prisen falt til stoploss-nivået. Slik beskytter vi kapitalen mot større tap.',
    takeProfitExplanation: 'Vi solgte fordi målprisen ble nådd. Strategien sikret gevinsten slik den var planlagt.',
    learnMoreUrl: '/kurs/trading-strategier/leksjon/smart-dca',
  },
  {
    _type: 'tradeExplanation',
    strategyKey: 'grid_trading',
    language: 'no',
    buyExplanation: 'Vi kjøpte fordi prisen falt til et lavere nivå i vårt grid. Grid-strategien kjøper automatisk når prisen går ned og selger når den går opp – perfekt for sideveis marked.',
    sellExplanation: 'Vi solgte fordi prisen nådde øvre nivå i gridet. Dette er slik strategien tjener på prissvingninger.',
    learnMoreUrl: '/kurs/trading-strategier/leksjon/grid-trading',
  },
];

const faqs = [
  {
    _type: 'faq',
    question: 'Hva er Klarpakke?',
    answer: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'Klarpakke er en plattform for å lære kryptotrading på en trygg måte. Vi tilbyr papirhandel (lekepenger), AI-drevne analyser, og automatisk trading.',
          },
        ],
      },
    ],
    category: 'general',
    language: 'no',
    order: 1,
  },
  {
    _type: 'faq',
    question: 'Er det gratis å bruke?',
    answer: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'Ja! Det er gratis å registrere seg og bruke papirhandel. For live trading og avanserte funksjoner trenger du en betalt plan.',
          },
        ],
      },
    ],
    category: 'billing',
    language: 'no',
    order: 2,
  },
];

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

async function migrateLandingContent() {
  console.log('📝 Migrating landing content...');
  
  try {
    // Check if content already exists
    const existing = await client.fetch('*[_type == "landingContent"]');
    if (existing.length > 0) {
      console.log('  ⚠️ Landing content already exists, skipping...');
      return;
    }
    
    await Promise.all([
      client.create(landingContentNo),
      client.create(landingContentEn),
    ]);
    
    console.log('  ✅ Landing content migrated');
  } catch (error) {
    console.error('  ❌ Failed to migrate landing content:', error);
  }
}

async function migrateStrategies() {
  console.log('🎯 Migrating strategies...');
  
  try {
    const existing = await client.fetch('*[_type == "strategy"]');
    if (existing.length > 0) {
      console.log('  ⚠️ Strategies already exist, skipping...');
      return;
    }
    
    for (const strategy of strategies) {
      await client.create(strategy);
    }
    
    console.log('  ✅ Strategies migrated');
  } catch (error) {
    console.error('  ❌ Failed to migrate strategies:', error);
  }
}

async function migrateTradeExplanations() {
  console.log('💡 Migrating trade explanations...');
  
  try {
    const existing = await client.fetch('*[_type == "tradeExplanation"]');
    if (existing.length > 0) {
      console.log('  ⚠️ Trade explanations already exist, skipping...');
      return;
    }
    
    for (const explanation of tradeExplanations) {
      await client.create(explanation);
    }
    
    console.log('  ✅ Trade explanations migrated');
  } catch (error) {
    console.error('  ❌ Failed to migrate trade explanations:', error);
  }
}

async function migrateFaqs() {
  console.log('❓ Migrating FAQs...');
  
  try {
    const existing = await client.fetch('*[_type == "faq"]');
    if (existing.length > 0) {
      console.log('  ⚠️ FAQs already exist, skipping...');
      return;
    }
    
    for (const faq of faqs) {
      await client.create(faq);
    }
    
    console.log('  ✅ FAQs migrated');
  } catch (error) {
    console.error('  ❌ Failed to migrate FAQs:', error);
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('🚀 Starting Sanity migration...\n');
  
  await migrateLandingContent();
  await migrateStrategies();
  await migrateTradeExplanations();
  await migrateFaqs();
  
  console.log('\n✨ Migration complete!');
  console.log('\nNext steps:');
  console.log('  1. Open Sanity Studio: npm run sanity');
  console.log('  2. Edit content at: http://localhost:3333');
  console.log('  3. Deploy when ready: npm run deploy');
}

main().catch(console.error);
