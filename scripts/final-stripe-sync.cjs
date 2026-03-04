const fs = require('fs');
const Stripe = require('/Users/taj/klarpakke/node_modules/stripe');

// Les production env
const envContent = fs.readFileSync('/Users/taj/klarpakke/.env.production', 'utf8');
const keyMatch = envContent.match(/STRIPE_SECRET_KEY="([^"]+)"/);
const apiKey = keyMatch ? keyMatch[1].trim().replace(/\\n/g, '') : null;

if (!apiKey || !apiKey.startsWith('sk_')) {
  console.error('❌ Stripe key ikke funnet');
  process.exit(1);
}

console.log('✅ Stripe key funnet:', apiKey.slice(0, 20) + '...\n');

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
      // Sjekk om finnes
      const search = await stripe.products.search({
        query: `metadata["tier"]:"${p.tier}"`
      });
      
      if (search.data.length > 0) {
        const existing = search.data[0];
        const prices = await stripe.prices.list({ product: existing.id });
        console.log('ℹ️  Eksisterer:', p.name);
        console.log('   Product:', existing.id);
        console.log('   Price:', prices.data[0]?.id || 'N/A');
        console.log('');
        results.push({ tier: p.tier, productId: existing.id, priceId: prices.data[0]?.id });
        continue;
      }
      
      // Opprett
      const product = await stripe.products.create({
        name: p.name,
        description: p.desc,
        metadata: { tier: p.tier, source: 'klarpakke' }
      });
      
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: p.amount,
        currency: 'nok',
        recurring: { interval: 'month' },
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
  
  console.log('✅ Ferdig!\n');
  console.log('📋 Vercel env vars:');
  results.forEach(r => {
    if (r.priceId) {
      console.log('NEXT_PUBLIC_STRIPE_PRICE_' + r.tier.toUpperCase() + '=' + r.priceId);
    }
  });
}

createProducts();
