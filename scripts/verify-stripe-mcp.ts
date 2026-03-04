import { executeStripeTool } from '../mcp-server/src/stripe-tools';

async function verify() {
    console.log('🔍 Verifying Stripe Products & active prices via MCP logic...\n');

    try {
        const productsJson = await executeStripeTool('stripe_list_products', { active: true });
        const products = JSON.parse(productsJson);

        console.log(`✅ Found ${products.length} active products.\n`);

        for (const product of products) {
            console.log(`📦 Product: ${product.name} (${product.id})`);
            const pricesJson = await executeStripeTool('stripe_list_prices', { product: product.id, active: true });
            const prices = JSON.parse(pricesJson);

            for (const price of prices) {
                const amount = price.unit_amount / 100;
                const currency = price.currency.toUpperCase();
                const interval = price.recurring ? `/${price.recurring.interval}` : 'one-time';
                console.log(`   💰 Price: ${amount} ${currency}${interval} (${price.id})`);
            }
            console.log('---');
        }
    } catch (error: any) {
        console.error('❌ Error during verification:', error.message);
    }
}

verify();
