const Stripe = require('stripe');
const { execSync } = require('child_process');

// Get Stripe key from Vercel
let apiKey;
try {
  apiKey = execSync('vercel env get STRIPE_SECRET_KEY production 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
} catch {}

if (!apiKey) {
  // Fallback to env file
  const fs = require('fs');
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/STRIPE_SECRET_KEY=([^\n]+)/);
  apiKey = match ? match[1].trim() : null;
}

if (!apiKey || apiKey.includes('dummy') || apiKey.includes('placeholder')) {
  console.error('❌ STRIPE_SECRET_KEY not found or invalid');
  process.exit(1);
}

const stripe = new Stripe(apiKey, { apiVersion: '2025-01-27.acacia' });

const products = [
  { name: 'Bachelor', amount: 24900, tier: 'bachelor', desc: 'Bygg et solid fundament for fremtiden' },
  { name: 'Master', amount: 49900, tier: 'master', desc: 'Akselerer din vekst med autotrading' },
  { name: 'PhD', amount: 99900, tier: 'phd', desc: 'For seriøse tradere med avanserte strategier' },
  { name: 'Professor', amount: 199900, tier: 'professor', desc: 'Det ultimate programmet for profesjonelle tradere' }
];

async function createProducts() {
  console.log('🔄 Oppretter Stripe-produkter...\n');
  const results = [];
  
  for (const p of products) {
    try {
      // Check if exists
      const existing = await stripe.products.search({
        query: `metadata["tier"]:"${p.tier}"`
      });
      
      if (existing.data.length > 0) {
        const prod = existing.data[0];
        const prices = await stripe.prices.list({ product: prod.id });
        console.log('ℹ️  Eksisterer:', p.name);
        console.log('   Product:', prod.id);
        console.log('   Price:', prices.data[0]?.id || 'N/A');
        console.log('');
        results.push({ tier: p.tier, productId: prod.id, priceId: prices.data[0]?.id });
        continue;
      }
      
      // Create product
      const product = await stripe.products.create({
        name: p.name,
        description: p.desc,
        metadata: { tier: p.tier, source: 'klarpakke' }
      });
      
      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: p.amount,
        currency: 'nok',
        recurring: { interval: 'month', interval_count: 1 },
        metadata: { tier: p.tier }
      });
      
      console.log('✅', p.name);
      console.log('   Product:', product.id);
      console.log('   Price:', price.id);
      console.log('   Amount:', (p.amount/100) + ' NOK/mnd\n');
      
      results.push({ tier: p.tier, productId: product.id, priceId: price.id });
    } catch (e) {
      console.error('❌', p.name, ':', e.message);
    }
  }
  
  console.log('\n📋 Vercel env vars:');
  results.forEach(r => {
    console.log('NEXT_PUBLIC_STRIPE_PRICE_' + r.tier.toUpperCase() + '=' + r.priceId);
  });
}

createProducts();
