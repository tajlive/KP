
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

// Load env vars manually from .env.local
const envPath = path.join(process.cwd(), '.env.local');
let stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/STRIPE_SECRET_KEY=["']?(sk_[^"'\s]+)["']?/);
    if (match) {
        stripeSecretKey = match[1];
    }
}

if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found');
    process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16' as any,
});

async function main() {
    console.log('🚀 Creating Test Product (20 NOK)...');

    const productName = 'Test Produkt (20 kr)';

    // Create Product
    const product = await stripe.products.create({
        name: productName,
        description: 'Midlertidig testprodukt for verifisering av betaling',
    });
    console.log(`✅ Created Product: ${product.name} (${product.id})`);

    // Create Price
    const price = await stripe.prices.create({
        product: product.id,
        unit_amount: 2000, // 20.00 NOK
        currency: 'nok',
    });
    console.log(`✅ Created Price: 20 NOK (${price.id})`);

    console.log('\n==================================================');
    console.log('👇 Use this Price ID for testing:');
    console.log(`NEXT_PUBLIC_PRICE_TEST_20=${price.id}`);
    console.log('==================================================');

    // Append to .env.local if not exists
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        if (!envContent.includes('NEXT_PUBLIC_PRICE_TEST_20')) {
            fs.appendFileSync(envPath, `\n# Test Price\nNEXT_PUBLIC_PRICE_TEST_20=${price.id}\n`);
            console.log('✅ Added NEXT_PUBLIC_PRICE_TEST_20 to .env.local');
        }
    }
}

main().catch(console.error);
