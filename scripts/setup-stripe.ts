
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
    console.error('❌ STRIPE_SECRET_KEY not found in environment or .env.local');
    console.error('👉 Please make sure you have set STRIPE_SECRET_KEY in .env.local');
    process.exit(1);
}

if (stripeSecretKey.startsWith('sk_live_')) {
    console.warn('⚠️  WARNING: You are using a LIVE Stripe key. Creating products in LIVE mode.');
    console.warn('   It is strongly recommended to use a TEST key (sk_test_...) for development.');
    // We allow it but warn heavily, as the user might intend to setup prod now.
} else {
    console.log('✅ Using TEST Stripe key.');
}

const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16' as any,
});

async function main() {
    console.log('🚀 Starting Stripe Setup...');

    const products = [
        {
            name: 'Krypto for Småsparere',
            description: 'Fra 0 til trygg investor på 4 uker.',
            prices: [
                { type: 'one_time', amount: 1249, currency: 'nok', key: 'NEXT_PUBLIC_PRICE_CRYPTO_COURSE' },
                { type: 'one_time', amount: 110, currency: 'eur', key: 'NEXT_PUBLIC_PRICE_CRYPTO_COURSE_EUR' },
                { type: 'one_time', amount: 120, currency: 'usd', key: 'NEXT_PUBLIC_PRICE_CRYPTO_COURSE_USD' },
                { type: 'recurring', amount: 399, currency: 'nok', interval: 'month', key: 'NEXT_PUBLIC_PRICE_CRYPTO_SUB' },
                { type: 'recurring', amount: 35, currency: 'eur', interval: 'month', key: 'NEXT_PUBLIC_PRICE_CRYPTO_SUB_EUR' },
                { type: 'recurring', amount: 39, currency: 'usd', interval: 'month', key: 'NEXT_PUBLIC_PRICE_CRYPTO_SUB_USD' }
            ]
        },
        {
            name: 'Trading Masterclass',
            description: 'Avanserte strategier for erfarne tradere.',
            prices: [
                { type: 'one_time', amount: 1899, currency: 'nok', key: 'NEXT_PUBLIC_PRICE_TRADING_COURSE' },
                { type: 'one_time', amount: 165, currency: 'eur', key: 'NEXT_PUBLIC_PRICE_TRADING_COURSE_EUR' },
                { type: 'one_time', amount: 179, currency: 'usd', key: 'NEXT_PUBLIC_PRICE_TRADING_COURSE_USD' },
                { type: 'recurring', amount: 549, currency: 'nok', interval: 'month', key: 'NEXT_PUBLIC_PRICE_TRADING_SUB' },
                { type: 'recurring', amount: 49, currency: 'eur', interval: 'month', key: 'NEXT_PUBLIC_PRICE_TRADING_SUB_EUR' },
                { type: 'recurring', amount: 55, currency: 'usd', interval: 'month', key: 'NEXT_PUBLIC_PRICE_TRADING_SUB_USD' }
            ]
        },
        {
            name: 'VIP Basic Medlemskap',
            description: 'Perfekt for nybegynnere',
            prices: [
                { type: 'recurring', amount: 249, currency: 'nok', interval: 'month', key: 'NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY' },
                { type: 'recurring', amount: 22, currency: 'eur', interval: 'month', key: 'NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY_EUR' },
                { type: 'recurring', amount: 25, currency: 'usd', interval: 'month', key: 'NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY_USD' },
                { type: 'recurring', amount: 2490, currency: 'nok', interval: 'year', key: 'NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL' },
                { type: 'recurring', amount: 220, currency: 'eur', interval: 'year', key: 'NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL_EUR' },
                { type: 'recurring', amount: 250, currency: 'usd', interval: 'year', key: 'NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL_USD' }
            ]
        },
        {
            name: 'VIP Komplett Medlemskap',
            description: 'Alt du trenger for å mestre trading',
            prices: [
                { type: 'recurring', amount: 499, currency: 'nok', interval: 'month', key: 'NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY' },
                { type: 'recurring', amount: 45, currency: 'eur', interval: 'month', key: 'NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY_EUR' },
                { type: 'recurring', amount: 49, currency: 'usd', interval: 'month', key: 'NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY_USD' },
                { type: 'recurring', amount: 4990, currency: 'nok', interval: 'year', key: 'NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL' },
                { type: 'recurring', amount: 450, currency: 'eur', interval: 'year', key: 'NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL_EUR' },
                { type: 'recurring', amount: 490, currency: 'usd', interval: 'year', key: 'NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL_USD' }
            ]
        },
        {
            name: 'VIP Pro Medlemskap',
            description: 'For seriøse studenter',
            prices: [
                { type: 'recurring', amount: 1249, currency: 'nok', interval: 'month', key: 'NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY' },
                { type: 'recurring', amount: 110, currency: 'eur', interval: 'month', key: 'NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY_EUR' },
                { type: 'recurring', amount: 120, currency: 'usd', interval: 'month', key: 'NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY_USD' },
                { type: 'recurring', amount: 12490, currency: 'nok', interval: 'year', key: 'NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL' },
                { type: 'recurring', amount: 1100, currency: 'eur', interval: 'year', key: 'NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL_EUR' },
                { type: 'recurring', amount: 1200, currency: 'usd', interval: 'year', key: 'NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL_USD' }
            ]
        }
    ];

    const envVars: Record<string, string> = {};

    for (const p of products) {
        console.log(`\n📦 Processing Product: ${p.name}`);

        // Check if product exists
        const existingProducts = await stripe.products.search({
            query: `name:'${p.name}'`,
        });

        let product = existingProducts.data[0];

        if (!product) {
            console.log(`   ➕ Creating product...`);
            product = await stripe.products.create({
                name: p.name,
                description: p.description,
            });
            console.log(`   ✅ Created product: ${product.id}`);
        } else {
            console.log(`   ℹ️  Product already exists: ${product.id}`);
        }

        for (const priceConfig of p.prices) {
            // Check if price exists for this product with same amount/currency/interval
            // Stripe API doesn't allow easy searching for prices by amount, so we list them
            const prices = await stripe.prices.list({
                product: product.id,
                active: true,
                limit: 100,
            });

            let price = prices.data.find(pr =>
                pr.unit_amount === priceConfig.amount * 100 &&
                pr.currency === priceConfig.currency &&
                (priceConfig.type === 'recurring' ? pr.recurring?.interval === priceConfig.interval : pr.type === 'one_time')
            );

            if (!price) {
                console.log(`   ➕ Creating price: ${priceConfig.amount} NOK${priceConfig.type === 'recurring' ? '/' + priceConfig.interval : ''}...`);

                const priceData: Stripe.PriceCreateParams = {
                    product: product.id,
                    unit_amount: priceConfig.amount * 100, // Stripe expects cents/øre
                    currency: priceConfig.currency,
                };

                if (priceConfig.type === 'recurring') {
                    priceData.recurring = {
                        interval: priceConfig.interval as Stripe.PriceCreateParams.Recurring.Interval,
                    };
                }

                price = await stripe.prices.create(priceData);
                console.log(`   ✅ Created price: ${price.id}`);
            } else {
                console.log(`   ℹ️  Price already exists: ${price.id} (${priceConfig.amount} NOK)`);
            }

            envVars[priceConfig.key] = price.id;
        }
    }

    console.log('\n\n==================================================');
    console.log('🎉 Setup Complete! Here are your .env variables:');
    console.log('==================================================\n');

    let output = '';
    for (const [key, value] of Object.entries(envVars)) {
        output += `${key}=${value}\n`;
    }

    console.log(output);
    console.log('==================================================');
    console.log('👉 Copy the lines above and paste them into your .env.local file.');
    console.log('==================================================');
}

main().catch(console.error);
