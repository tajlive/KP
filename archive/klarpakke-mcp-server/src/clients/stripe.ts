import { Buffer } from "node:buffer";

/**
 * Stripe Integration - Payments, Subscriptions, and Billing
 */

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

if (!STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set - Stripe tools will be disabled");
}

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe not configured");
  }

  const url = `${STRIPE_API}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Stripe error: ${error.error?.message || response.statusText}`,
    );
  }

  return response.json();
}

// ==================== CUSTOMERS ====================

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  created: number;
  subscriptions: {
    data: StripeSubscription[];
  };
}

export async function getCustomer(customerId: string): Promise<StripeCustomer> {
  return stripeFetch(`/customers/${customerId}?expand[]=subscriptions`);
}

export async function searchCustomers(
  query: string,
): Promise<StripeCustomer[]> {
  const result = await stripeFetch<{ data: StripeCustomer[] }>(
    `/customers/search?query=${encodeURIComponent(query)}`,
  );
  return result.data;
}

export async function createCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>,
): Promise<StripeCustomer> {
  const params = new URLSearchParams();
  params.append("email", email);
  if (name) params.append("name", name);
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      params.append(`metadata[${key}]`, value);
    });
  }

  return stripeFetch("/customers", {
    method: "POST",
    body: params,
  });
}

// ==================== SUBSCRIPTIONS ====================

export interface StripeSubscription {
  id: string;
  customer: string;
  status: "active" | "canceled" | "incomplete" | "past_due" | "unpaid";
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: {
    data: Array<{
      price: {
        id: string;
        product: string;
        unit_amount: number;
        currency: string;
        recurring?: {
          interval: "day" | "week" | "month" | "year";
          interval_count: number;
        };
      };
    }>;
  };
}

export async function getSubscription(
  subId: string,
): Promise<StripeSubscription> {
  return stripeFetch(`/subscriptions/${subId}`);
}

export async function listSubscriptions(
  customerId?: string,
): Promise<StripeSubscription[]> {
  let url = "/subscriptions?status=all&expand[]=data.items.data.price.product";
  if (customerId) {
    url += `&customer=${customerId}`;
  }
  const result = await stripeFetch<{ data: StripeSubscription[] }>(url);
  return result.data;
}

export async function cancelSubscription(
  subId: string,
  immediate?: boolean,
): Promise<StripeSubscription> {
  const params = new URLSearchParams();
  if (immediate) {
    // Cancel immediately
    return stripeFetch(`/subscriptions/${subId}`, {
      method: "DELETE",
    });
  } else {
    // Cancel at period end
    params.append("cancel_at_period_end", "true");
    return stripeFetch(`/subscriptions/${subId}`, {
      method: "POST",
      body: params,
    });
  }
}

export async function createSubscription(
  customerId: string,
  priceId: string,
): Promise<StripeSubscription> {
  const params = new URLSearchParams();
  params.append("customer", customerId);
  params.append("items[0][price]", priceId);
  params.append("payment_behavior", "default_incomplete");
  params.append("expand[]", "latest_invoice.payment_intent");

  return stripeFetch("/subscriptions", {
    method: "POST",
    body: params,
  });
}

// ==================== PAYMENTS ====================

export interface StripePayment {
  id: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed";
  customer?: string;
  created: number;
  receipt_email?: string;
}

export async function getPayment(paymentId: string): Promise<StripePayment> {
  return stripeFetch(`/payment_intents/${paymentId}`);
}

export async function listPayments(
  customerId?: string,
  limit: number = 10,
): Promise<StripePayment[]> {
  let url = `/payment_intents?limit=${limit}`;
  if (customerId) {
    url += `&customer=${customerId}`;
  }
  const result = await stripeFetch<{ data: StripePayment[] }>(url);
  return result.data;
}

export async function refundPayment(
  paymentIntentId: string,
  amount?: number,
  reason?: string,
): Promise<any> {
  const params = new URLSearchParams();
  params.append("payment_intent", paymentIntentId);
  if (amount) params.append("amount", amount.toString());
  if (reason) params.append("reason", reason);

  return stripeFetch("/refunds", {
    method: "POST",
    body: params,
  });
}

// ==================== PRODUCTS & PRICES ====================

export interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  metadata: Record<string, string>;
}

export interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  type: "one_time" | "recurring";
  recurring?: {
    interval: "day" | "week" | "month" | "year";
    interval_count: number;
  };
}

export async function listProducts(): Promise<StripeProduct[]> {
  const result = await stripeFetch<{ data: StripeProduct[] }>(
    "/products?active=true",
  );
  return result.data;
}

export async function listPrices(productId?: string): Promise<StripePrice[]> {
  let url = "/prices?active=true";
  if (productId) {
    url += `&product=${productId}`;
  }
  const result = await stripeFetch<{ data: StripePrice[] }>(url);
  return result.data;
}

// ==================== INVOICES ====================

export interface StripeInvoice {
  id: string;
  customer: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  period_start: number;
  period_end: number;
  pdf?: string;
}

export async function listInvoices(
  customerId?: string,
): Promise<StripeInvoice[]> {
  let url = "/invoices?limit=20";
  if (customerId) {
    url += `&customer=${customerId}`;
  }
  const result = await stripeFetch<{ data: StripeInvoice[] }>(url);
  return result.data;
}

// ==================== ANALYTICS ====================

export async function getMRR(): Promise<number> {
  const subscriptions = await listSubscriptions();
  return subscriptions
    .filter((sub) => sub.status === "active")
    .reduce((total, sub) => {
      const item = sub.items.data[0];
      if (item && item.price) {
        // Convert to monthly
        const amount = item.price.unit_amount;
        if (sub.items.data[0].price.recurring?.interval === "year") {
          return total + amount / 12;
        } else if (sub.items.data[0].price.recurring?.interval === "month") {
          return total + amount;
        }
      }
      return total;
    }, 0);
}

export async function getRevenueStats(days: number = 30): Promise<{
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  refunds: number;
}> {
  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);

  const [payments, refunds] = await Promise.all([
    stripeFetch<{ data: any[] }>(
      `/payment_intents?created[gte]=${since}&limit=100`,
    ),
    stripeFetch<{ data: any[] }>(`/refunds?created[gte]=${since}&limit=100`),
  ]);

  const successful = payments.data.filter((p) => p.status === "succeeded");
  const failed = payments.data.filter((p) => p.status === "failed");

  return {
    totalRevenue: successful.reduce((sum, p) => sum + p.amount, 0) / 100,
    successfulPayments: successful.length,
    failedPayments: failed.length,
    refunds: refunds.data.reduce((sum, r) => sum + r.amount, 0) / 100,
  };
}

// ==================== CHECKOUT SESSIONS ====================

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ url: string; id: string }> {
  const params = new URLSearchParams();
  params.append("customer", customerId);
  params.append("line_items[0][price]", priceId);
  params.append("line_items[0][quantity]", "1");
  params.append("mode", "subscription");
  params.append("success_url", successUrl);
  params.append("cancel_url", cancelUrl);

  return stripeFetch("/checkout/sessions", {
    method: "POST",
    body: params,
  });
}

// ==================== WEBHOOKS ====================

export function verifyWebhook(payload: string, signature: string): boolean {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET not set");
  }

  // In production, use proper Stripe webhook verification
  // This is a simplified version
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
