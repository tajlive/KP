
import Stripe from 'stripe';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root (2 levels up from src/)
const envPath = join(__dirname, '../../.env.local');
config({ path: envPath });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
});

export const stripeTools = [
    {
        name: "stripe_check_mobilepay_status",
        description: "Check if MobilePay (Vipps) payment method is active in Stripe",
        input_schema: {
            type: "object",
            properties: {},
            required: []
        }
    },
    {
        name: "stripe_activate_mobilepay",
        description: "Activate MobilePay (Vipps) as a payment method in Stripe. This enables Norwegian customers to pay with Vipps.",
        input_schema: {
            type: "object",
            properties: {
                account_country: { type: "string", description: "The country code of the Stripe account (e.g., 'NO' for Norway)", default: "NO" }
            },
            required: []
        }
    },
    {
        name: "stripe_list_payment_methods",
        description: "List all available payment methods in Stripe account",
        input_schema: {
            type: "object",
            properties: {
                type: { type: "string", description: "Filter by payment method type (e.g., 'mobilepay')" }
            },
            required: []
        }
    },
    {
        name: "stripe_list_products",
        description: "List all products in Stripe",
        input_schema: {
            type: "object",
            properties: {
                limit: { type: "number", description: "Limit number of products (default 100)" },
                active: { type: "boolean", description: "Filter by active status" }
            },
            required: []
        }
    },
    {
        name: "stripe_create_product",
        description: "Create a product in Stripe",
        input_schema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Product name" },
                description: { type: "string", description: "Product description" },
                metadata: { type: "object", description: "Metadata key-value pairs" }
            },
            required: ["name"]
        }
    },
    {
        name: "stripe_list_prices",
        description: "List all prices in Stripe",
        input_schema: {
            type: "object",
            properties: {
                product: { type: "string", description: "Filter by product ID" },
                limit: { type: "number", description: "Limit number of prices" },
                active: { type: "boolean", description: "Filter by active status" }
            },
            required: []
        }
    },
    {
        name: "stripe_create_price",
        description: "Create a price for a product in Stripe",
        input_schema: {
            type: "object",
            properties: {
                product: { type: "string", description: "Product ID" },
                unit_amount: { type: "number", description: "Amount in smallest currency unit (e.g., cents)" },
                currency: { type: "string", description: "Currency code (lowercase, e.g. usd)" },
                recurring: {
                    type: "object",
                    properties: {
                        interval: { type: "string", enum: ["day", "week", "month", "year"] },
                        interval_count: { type: "number" }
                    },
                    required: ["interval"]
                },
                metadata: { type: "object", description: "Metadata key-value pairs" },
                nickname: { type: "string", description: "Price nickname" }
            },
            required: ["product", "unit_amount", "currency"]
        }
    },
    {
        name: "stripe_list_webhook_endpoints",
        description: "List all webhook endpoints in Stripe",
        input_schema: {
            type: "object",
            properties: {
                limit: { type: "number", description: "Limit number of endpoints (default 100)" }
            },
            required: []
        }
    },
    {
        name: "stripe_create_webhook_endpoint",
        description: "Create a webhook endpoint in Stripe",
        input_schema: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL of the webhook endpoint" },
                enabled_events: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of events to enable (e.g. ['checkout.session.completed'])"
                },
                description: { type: "string", description: "Optional description" }
            },
            required: ["url", "enabled_events"]
        }
    }
];

export async function executeStripeTool(name: string, args: any): Promise<string> {
    if (!process.env.STRIPE_SECRET_KEY) {
        return JSON.stringify({ error: "STRIPE_SECRET_KEY not found in environment" });
    }

    try {
        switch (name) {
            case "stripe_check_mobilepay_status": {
                try {
                    // Check account capabilities to see if MobilePay is available
                    // Note: For standard accounts, we need to retrieve the account first
                    const account = await stripe.accounts.retrieve();
                    const capabilities = (account as any).capabilities || {};
                    const mobilepayStatus = capabilities.mobilepay_payments;
                    
                    if (mobilepayStatus === 'active') {
                        return JSON.stringify({
                            status: "active",
                            active: true,
                            message: "MobilePay (Vipps) is active and ready for use!"
                        }, null, 2);
                    } else if (mobilepayStatus === 'pending') {
                        return JSON.stringify({
                            status: "pending",
                            active: false,
                            message: "MobilePay is pending activation. Check Stripe Dashboard for verification requirements."
                        }, null, 2);
                    } else {
                        return JSON.stringify({
                            status: mobilepayStatus || "inactive",
                            active: false,
                            message: "MobilePay (Vipps) is not active. You need to activate it in Stripe Dashboard > Settings > Payment methods."
                        }, null, 2);
                    }
                } catch (error: any) {
                    // If we can't check, provide manual instructions
                    return JSON.stringify({
                        status: "unknown",
                        active: false,
                        error: error.message,
                        message: "Could not automatically check MobilePay status.",
                        manual_check: "Log in to Stripe Dashboard → Settings → Payment methods → Look for MobilePay"
                    }, null, 2);
                }
            }

            case "stripe_activate_mobilepay": {
                const country = args.account_country || 'NO';
                
                try {
                    // Note: Stripe API doesn't allow direct activation via API for most payment methods
                    // This provides instructions for manual activation
                    return JSON.stringify({
                        success: false,
                        manual_action_required: true,
                        instructions: {
                            step1: "Log in to Stripe Dashboard: https://dashboard.stripe.com",
                            step2: "Go to Settings → Payment methods",
                            step3: "Find 'MobilePay' in the list (this is Vipps in Norway)",
                            step4: "Click 'Activate' or 'Request access'",
                            step5: "Complete any required verification steps",
                            step6: "MobilePay will be available for Norwegian customers automatically"
                        },
                        note: "MobilePay (Vipps) activation requires manual approval from Stripe for compliance reasons.",
                        requirements: [
                            "Norwegian Stripe account or multi-currency support",
                            "Valid business information",
                            "Website/app that complies with Vipps terms"
                        ]
                    }, null, 2);
                } catch (error: any) {
                    return JSON.stringify({ error: error.message });
                }
            }

            case "stripe_list_payment_methods": {
                try {
                    const account = await stripe.accounts.retrieve();
                    const capabilities = (account as any).capabilities || {};
                    
                    // Convert capabilities object to array
                    const paymentMethods = Object.entries(capabilities).map(([key, status]) => ({
                        id: key,
                        status: status
                    }));
                    
                    // Filter by type if provided
                    const filtered = args?.type 
                        ? paymentMethods.filter((p: {id: string}) => p.id.includes(args.type))
                        : paymentMethods;
                        
                    return JSON.stringify(filtered, null, 2);
                } catch (error: any) {
                    return JSON.stringify({ 
                        error: error.message,
                        note: "Payment methods can be viewed in Stripe Dashboard > Settings > Payment methods"
                    });
                }
            }

            case "stripe_list_products": {
                const products = await stripe.products.list({
                    limit: args.limit || 100,
                    active: args.active
                });
                return JSON.stringify(products.data, null, 2);
            }

            case "stripe_create_product": {
                const product = await stripe.products.create({
                    name: args.name,
                    description: args.description,
                    metadata: args.metadata
                });
                return JSON.stringify(product, null, 2);
            }

            case "stripe_list_prices": {
                const prices = await stripe.prices.list({
                    product: args.product,
                    limit: args.limit || 100,
                    active: args.active
                });
                return JSON.stringify(prices.data, null, 2);
            }

            case "stripe_create_price": {
                const price = await stripe.prices.create({
                    product: args.product,
                    unit_amount: args.unit_amount,
                    currency: args.currency,
                    recurring: args.recurring,
                    metadata: args.metadata,
                    nickname: args.nickname
                });
                return JSON.stringify(price, null, 2);
            }

            case "stripe_list_webhook_endpoints": {
                const endpoints = await stripe.webhookEndpoints.list({
                    limit: args.limit || 100
                });
                return JSON.stringify(endpoints.data, null, 2);
            }

            case "stripe_create_webhook_endpoint": {
                const webhook = await stripe.webhookEndpoints.create({
                    url: args.url,
                    enabled_events: args.enabled_events,
                    description: args.description,
                    metadata: args.metadata
                });
                return JSON.stringify(webhook, null, 2);
            }

            default:
                return JSON.stringify({ error: `Unknown Stripe tool: ${name}` });
        }
    } catch (error: any) {
        return JSON.stringify({ error: error.message });
    }
}
