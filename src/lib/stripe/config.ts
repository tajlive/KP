import Stripe from "stripe";

/**
 * Stripe server-side instance
 * Only use this on the server (API routes, server components)
 *
 * NOTE: We lazy-initialize to avoid build-time errors when env vars are not set.
 * This allows the build to complete, and errors will only occur at runtime
 * if the API is actually called without proper configuration.
 */
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2026-08-26.dahlia",
    typescript: true,
  });

  return stripeInstance;
}

// Backward-compatible export for existing code that uses `stripe` directly
// This will throw at runtime (not build-time) if STRIPE_SECRET_KEY is missing
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe();
    return instance[prop as keyof Stripe];
  },
});

/**
 * Stripe publishable key for client-side
 */
export const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set");
}
