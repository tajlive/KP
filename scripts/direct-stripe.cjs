// Bruker Stripe SDK direkte - nøkkel fra env
const Stripe = require('/Users/taj/klarpakke/node_modules/stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { 
  apiVersion: '2025-01-27.acacia' 
});

const products = [
  { name: 'Bachelor', amount: 24900, tier: 'bachelor', desc: 'Bygg et solid fundament' },
  { name: 'Master', amount: 49900, tier: 'master', desc: 'Akselerer din vekst' },
  { name: 'PhD', amount: 99900, tier: 'phd', desc: 'For seriøse tradere' },
  { name: 'Professor', amount: 199900, tier: 'professor', desc: 'Ultimate program' }
];

async function create() {
  console.log('🔄 Oppretter Stripe-produkter...\n');
  
  for (const p of products) {
    try {
      const product = await stripe.products.create({
        name: p.name,
        description: p.desc,
        metadata: { tier: p.tier }
      });
      console.log('✅', p.name, '| Product:', product.id);
      
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: p.amount,
        currency: 'nok',
        recurring: { interval: 'month' },
        metadata: { tier: p.tier }
      });
      console.log('   💰 Price:', price.id, '|', (p.amount/100) + ' NOK/mnd\n');
      
    } catch (e) {
      console.error('❌', p.name, ':', e.message);
    }
  }
  console.log('✅ Done!');
}

create();
