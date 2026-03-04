const Stripe = require('stripe');

// Lim inn din Stripe Secret Key her (sk_test_... for test, sk_live_... for produksjon)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_live_din_nøkkel_her';

if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'sk_live_din_nøkkel_her') {
  console.error('❌ Sett STRIPE_SECRET_KEY først!');
  console.error('   export STRIPE_SECRET_KEY=sk_live_...');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' });

const products = [
  { name: 'Bachelor', amount: 29000, tier: 'bachelor', desc: 'Perfekt for enkeltpersoner som vil komme i gang' },
  { name: 'Master', amount: 49000, tier: 'master', desc: 'For små team som trenger mer kapasitet' },
  { name: 'PhD', amount: 99000, tier: 'phd', desc: 'For voksende team med avanserte behov' },
  { name: 'Professor', amount: 199000, tier: 'professor', desc: 'For store organisasjoner med skreddersøm' }
];

async function createProducts() {
  console.log('🔄 Oppretter Stripe-produkter...\n');
  const results = [];
  
  for (const p of products) {
    try {
      // Sjekk om produkt finnes fra før
      const existing = await stripe.products.search({
        query: `metadata["tier"]:"${p.tier}"`
      });
      
      if (existing.data.length > 0) {
        console.log('ℹ️  Produkt eksisterer:', p.name);
        const product = existing.data[0];
        const prices = await stripe.prices.list({ product: product.id });
        if (prices.data.length > 0) {
          console.log('   Price ID:', prices.data[0].id);
          results.push({ tier: p.tier, productId: product.id, priceId: prices.data[0].id });
        }
        console.log('');
        continue;
      }
      
      // Opprett nytt produkt
      const product = await stripe.products.create({
        name: p.name,
        description: p.desc,
        metadata: { tier: p.tier, source: 'klarpakke_setup' }
      });
      console.log('✅ Produkt:', p.name);
      console.log('   ID:', product.id);
      
      // Opprett pris
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: p.amount,
        currency: 'nok',
        recurring: { interval: 'month' },
        metadata: { tier: p.tier }
      });
      console.log('💰 Price ID:', price.id);
      console.log('   Pris:', (p.amount/100) + ' NOK/mnd\n');
      
      results.push({ tier: p.tier, productId: product.id, priceId: price.id });
    } catch(e) {
      console.error('❌ Feil med', p.name, ':', e.message);
    }
  }
  
  console.log('✅ Ferdig!\n');
  console.log('📋 Oppdater disse i Vercel:');
  results.forEach(r => {
    console.log('NEXT_PUBLIC_STRIPE_PRICE_' + r.tier.toUpperCase() + '=' + r.priceId);
  });
}

createProducts();
