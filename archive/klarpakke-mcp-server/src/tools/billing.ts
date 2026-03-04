/**
 * Billing Tools - Stripe integration for payments and subscriptions
 */

import * as stripe from '../clients/stripe.ts';
import { getSupabase } from '../clients/supabase.ts';
import type { ToolOutput } from '../types.ts';

export async function getStripeCustomer(args: { customer_id: string }): Promise<ToolOutput> {
  try {
    const customer = await stripe.getCustomer(args.customer_id);
    
    const subs = customer.subscriptions?.data.map(s => `
  • ${s.id}: ${s.status} (${new Date(s.current_period_start * 1000).toLocaleDateString()} - ${new Date(s.current_period_end * 1000).toLocaleDateString()})`).join('') || '  None';
    
    return {
      content: [{
        type: 'text',
        text: `💳 Stripe Customer

ID: ${customer.id}
Email: ${customer.email}
Name: ${customer.name || 'N/A'}
Created: ${new Date(customer.created * 1000).toLocaleString()}

Subscriptions:
${subs}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function searchStripeCustomers(args: { query: string }): Promise<ToolOutput> {
  try {
    const customers = await stripe.searchCustomers(args.query);
    
    const list = customers.map((c, i) => `${i + 1}. ${c.email} (${c.id})${c.name ? ` - ${c.name}` : ''}`).join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `🔍 Found ${customers.length} customer(s):\n\n${list || 'No results'}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function listSubscriptions(args: { customer_id?: string }): Promise<ToolOutput> {
  try {
    const subs = await stripe.listSubscriptions(args.customer_id);
    
    const list = subs.map(s => `
${s.id}
  Status: ${s.status}
  Customer: ${s.customer}
  Current Period: ${new Date(s.current_period_start * 1000).toLocaleDateString()} - ${new Date(s.current_period_end * 1000).toLocaleDateString()}
  Cancel at period end: ${s.cancel_at_period_end ? 'Yes' : 'No'}
  Items: ${s.items.data.map(i => `${i.price.id} (${i.price.unit_amount / 100} ${i.price.currency})`).join(', ')}`).join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `📋 Subscriptions (${subs.length}):\n${list || 'No subscriptions'}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function cancelSubscription(args: { subscription_id: string; immediate?: boolean }): Promise<ToolOutput> {
  try {
    const sub = await stripe.cancelSubscription(args.subscription_id, args.immediate);
    
    return {
      content: [{
        type: 'text',
        text: `🚫 Subscription Cancelled

ID: ${sub.id}
Status: ${sub.status}
${!args.immediate ? 'Will cancel at period end' : 'Cancelled immediately'}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function getRevenueStats(args: { days?: number }): Promise<ToolOutput> {
  try {
    const stats = await stripe.getRevenueStats(args.days || 30);
    const mrr = await stripe.getMRR();
    
    return {
      content: [{
        type: 'text',
        text: `💰 Revenue Stats (Last ${args.days || 30} Days)

Total Revenue: ${stats.totalRevenue.toLocaleString('no-NO')} NOK
MRR: ${(mrr / 100).toLocaleString('no-NO')} NOK

Payments:
  Successful: ${stats.successfulPayments}
  Failed: ${stats.failedPayments}
  
Refunds: ${stats.refunds.toLocaleString('no-NO')} NOK`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function refundPayment(args: { payment_intent_id: string; amount?: number; reason?: string }): Promise<ToolOutput> {
  try {
    const refund = await stripe.refundPayment(args.payment_intent_id, args.amount, args.reason);
    
    return {
      content: [{
        type: 'text',
        text: `↩️ Refund Processed

Refund ID: ${refund.id}
Amount: ${args.amount ? (args.amount / 100).toLocaleString('no-NO') : 'Full amount'} NOK
Status: ${refund.status}
Reason: ${args.reason || 'Not specified'}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}

export async function listStripeProducts(): Promise<ToolOutput> {
  try {
    const products = await stripe.listProducts();
    const prices = await stripe.listPrices();
    
    const list = products.map(p => {
      const productPrices = prices.filter(pr => pr.product === p.id);
      return `
${p.name}
  ID: ${p.id}
  Active: ${p.active ? 'Yes' : 'No'}
  Prices: ${productPrices.map(pr => `${pr.unit_amount / 100} ${pr.currency} (${pr.type})`).join(', ') || 'None'}`;
    }).join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `📦 Products (${products.length}):\n${list}`,
      }],
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown'}` }], isError: true };
  }
}
