import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia",
});

export async function verifyStripeWebhook(
  body: string,
): Promise<Stripe.Event | null> {
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("[Stripe] Missing signature");
    return null;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe] STRIPE_WEBHOOK_SECRET ikke satt");
    return null;
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );
    return event;
  } catch (err) {
    console.error("[Stripe] Webhook signature verification failed:", err);
    return null;
  }
}
