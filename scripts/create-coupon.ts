
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

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
    console.log('🎟️ Creating WELCOME50 Coupon...');

    try {
        // Create Coupon
        const coupon = await stripe.coupons.create({
            id: 'WELCOME50',
            percent_off: 50,
            duration: 'repeating',
            duration_in_months: 1,
            name: '50% Velkomstrabatt (Første måned)',
        });

        console.log(`✅ Coupon created: ${coupon.id}`);

        // Create Promotion Code (optional, but good for easy usage)
        const promoCode = await (stripe.promotionCodes.create as any)({
            coupon: coupon.id,
            code: 'WELCOME50',
        });

        console.log(`✅ Promotion Code created: ${promoCode.code}`);
    } catch (error: any) {
        if (error.code === 'resource_already_exists') {
            console.log('ℹ️ Coupon/PromoCode already exists.');
        } else {
            console.error('❌ Error creating coupon:', error.message);
        }
    }
}

main();
