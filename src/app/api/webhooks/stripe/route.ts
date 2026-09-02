// ═══════════════════════════════════════════════════════════════
// Stripe Webhook - Håndterer betalingshendelser
// KLA-32: Billing & Recovery: Stripe Webhook Integration
// ═══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";
import type { Database } from "@/types/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Idempotency: spor behandlede events for å hindre dobbel prosessering
const processedEvents = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 timer

function isDuplicateEvent(eventId: string): boolean {
  const now = Date.now();
  const processedAt = processedEvents.get(eventId);

  if (processedAt && now - processedAt < IDEMPOTENCY_WINDOW_MS) {
    return true;
  }

  // Cleanup gamle entries hvis map vokser for stor
  if (processedEvents.size > 10000) {
    for (const [key, time] of processedEvents) {
      if (now - time > IDEMPOTENCY_WINDOW_MS) {
        processedEvents.delete(key);
      }
    }
  }

  processedEvents.set(eventId, now);
  return false;
}

// Stripe client
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY ikke satt");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-08-26.dahlia",
  });
};

// Supabase admin client
const getSupabase = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
};

// Resend for email — null when key missing so webhook doesn't crash
const getResend = (): Resend | null => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
};

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("[Stripe Webhook] Mangler signature");
      return NextResponse.json(
        { error: "Mangler stripe-signature header" },
        { status: 400 },
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET ikke satt");
      return NextResponse.json(
        { error: "Webhook secret ikke konfigurert" },
        { status: 500 },
      );
    }

    // Verifiser signature
    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: unknown) {
      console.error(
        "[Stripe Webhook] Signatur-verifisering feilet:",
        err instanceof Error ? err.message : String(err),
      );
      return NextResponse.json({ error: "Ugyldig signatur" }, { status: 400 });
    }
    // Idempotency sjekk
    const eventId = `${event.id}:${event.type}`;
    if (isDuplicateEvent(eventId)) {
      return NextResponse.json({ received: true, idempotent: true });
    }

    // Håndter ulike event-typer
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      default:
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("[Stripe Webhook] Feil:", error);
    return NextResponse.json(
      { error: "Webhook-prosessering feilet" },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Event handlers
// ═══════════════════════════════════════════════════════════════

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = getSupabase();
  const userId = session.metadata?.supabase_user_id;
  // Fallback: try to get tier from price_id mapping if tier not in metadata
  const priceId = session.metadata?.price_id;
  const tier = session.metadata?.tier || mapPriceIdToTier(priceId);
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!userId || !tier) {
    console.error("[Stripe Webhook] Manglende metadata i checkout session");
    return;
  }

  // Map tier til riktig plan_type
  const planType = mapTierToPlanType(tier);

  try {
    // Oppdater eller opprett subscription
    const { error: subError } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan_type: planType,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "stripe_subscription_id",
      },
    );

    if (subError) {
      console.error(
        "[Stripe Webhook] Feil ved upsert av subscription:",
        subError,
      );
      return;
    }

    // Oppdater profil
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        subscription_tier: planType,
        subscription_status: "active",
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", userId);

    if (profileError) {
      console.error(
        "[Stripe Webhook] Feil ved oppdatering av profil:",
        profileError,
      );
      return;
    }
    // Send velkomst-email
    await sendWelcomeEmail(userId, planType);
  } catch (error) {
    console.error("[Stripe Webhook] Feil i handleCheckoutCompleted:", error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = getSupabase();
  const subscriptionId = (invoice as { subscription?: string }).subscription;

  if (!subscriptionId) return;

  try {
    const periodEnd = invoice.lines.data[0]?.period?.end
      ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("stripe_subscription_id", subscriptionId);

    if (error) {
      console.error("[Stripe Webhook] Feil ved payment succeeded:", error);
      return;
    }

    // Oppdater også profil (via user_id fra subscriptions)
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (sub?.user_id) {
      await supabase
        .from("user_profiles")
        .update({
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", sub.user_id);
    }
  } catch (error) {
    console.error("[Stripe Webhook] Feil i handlePaymentSucceeded:", error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = getSupabase();
  const subscriptionId = (invoice as { subscription?: string }).subscription;
  const customerId = invoice.customer as string | undefined;

  if (!subscriptionId || !customerId) return;

  try {
    // Oppdater subscription status
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("stripe_subscription_id", subscriptionId);

    if (error) {
      console.error("[Stripe Webhook] Feil ved payment failed:", error);
      return;
    }

    // Oppdater profil (via user_id fra subscriptions)
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (sub?.user_id) {
      await supabase
        .from("user_profiles")
        .update({
          subscription_status: "past_due",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", sub.user_id);
    }

    // Send påminnelse om betaling
    await sendPaymentFailedEmail(customerId, subscriptionId);
  } catch (error) {
    console.error("[Stripe Webhook] Feil i handlePaymentFailed:", error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const supabase = getSupabase();

  try {
    // Cast to access period fields (Stripe types are partial)
    const subWithPeriod = subscription as unknown as {
      current_period_start?: number;
      current_period_end?: number;
      status: string;
    };

    // Get customer ID and metadata
    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;

    // Try to find existing user by customer ID
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    // If no existing subscription record, try to get user from metadata
    let userId = existingSub?.user_id;

    if (!userId) {
      // Check if metadata contains user_id from checkout session
      const metadataUserId = subscription.metadata?.supabase_user_id;
      if (metadataUserId) {
        userId = metadataUserId;
      }
    }

    if (!userId) {
      console.warn(
        `[Stripe Webhook] No user found for subscription ${subscriptionId}`,
      );
      return;
    }

    // Get price and tier info
    const priceId = subscription.items?.data[0]?.price?.id;
    const tier = mapPriceIdToTier(priceId) || "student";
    const planType = mapTierToPlanType(tier);

    // Upsert subscription record
    const { error: subError } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan_type: planType,
        status: subWithPeriod.status,
        current_period_start: subWithPeriod.current_period_start
          ? new Date(subWithPeriod.current_period_start * 1000).toISOString()
          : new Date().toISOString(),
        current_period_end: subWithPeriod.current_period_end
          ? new Date(subWithPeriod.current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "stripe_subscription_id",
      },
    );

    if (subError) {
      console.error(
        "[Stripe Webhook] Feil ved opprettelse av subscription:",
        subError,
      );
      return;
    }

    // Update profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        subscription_tier: planType,
        subscription_status:
          subWithPeriod.status === "active" ? "active" : "pending",
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", userId);

    if (profileError) {
      console.error(
        "[Stripe Webhook] Feil ved oppdatering av profil:",
        profileError,
      );
      return;
    }
  } catch (error) {
    console.error("[Stripe Webhook] Feil i handleSubscriptionCreated:", error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = getSupabase();

  try {
    // Access current_period_end from the subscription items or cast to access it
    const subWithPeriod = subscription as unknown as {
      current_period_end?: number;
      status: string;
      cancel_at_period_end: boolean;
    };

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: subWithPeriod.status,
        cancel_at_period_end: subWithPeriod.cancel_at_period_end,
        current_period_end: subWithPeriod.current_period_end
          ? new Date(subWithPeriod.current_period_end * 1000).toISOString()
          : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("[Stripe Webhook] Feil ved subscription update:", error);
      return;
    }

    // Oppdater profil hvis cancelled (via user_id fra subscriptions)
    if (
      subscription.status === "canceled" ||
      subscription.cancel_at_period_end
    ) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (sub?.user_id) {
        await supabase
          .from("user_profiles")
          .update({
            subscription_status: subscription.cancel_at_period_end
              ? "active"
              : "canceled",
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", sub.user_id);
      }
    }
  } catch (error) {
    console.error("[Stripe Webhook] Feil i handleSubscriptionUpdated:", error);
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const supabase = getSupabase();

  try {
    // Finn bruker
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (!sub?.user_id) return;

    // Oppdater subscription
    await supabase
      .from("subscriptions")
      .update({
        status: "cancelled" as string,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    // Nedgrader bruker til free
    if (sub?.user_id) {
      await supabase
        .from("user_profiles")
        .update({
          subscription_tier: "student",
          subscription_status: "canceled",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", sub.user_id);
    }
  } catch (error) {
    console.error(
      "[Stripe Webhook] Feil i handleSubscriptionCancelled:",
      error,
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Hjelpefunksjoner
// ═══════════════════════════════════════════════════════════════

function mapTierToPlanType(tier: string): string {
  // Mapper UI-tier til database plan_type
  const tierMap: { [key: string]: string } = {
    bachelor: "bachelor",
    master: "master",
    phd: "phd",
    professor: "professor",
    student: "student",
    free: "student",
  };
  return tierMap[tier] || "student";
}

// Helper to map price ID to tier when metadata is missing
function mapPriceIdToTier(priceId: string | undefined): string | undefined {
  if (!priceId) return undefined;
  const priceMap: { [key: string]: string } = {
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_BACHELOR || ""]: "bachelor",
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_MASTER || ""]: "master",
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_PHD || ""]: "phd",
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR || ""]: "professor",
  };
  return priceMap[priceId];
}

async function sendWelcomeEmail(userId: string, planType: string) {
  try {
    const supabase = getSupabase();
    const resend = getResend();
    if (!resend) {
      console.warn(
        "[Stripe Webhook] RESEND_API_KEY mangler, hopper over velkomst-email",
      );
      return;
    }

    // Hent bruker-info
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (!profile?.email) return;

    // Opprett billing portal session for å gi bruker tilgang til fakturaer
    const stripe = getStripe();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    let portalUrl = "https://www.klarpakke.no/no/dashboard/settings";
    if (sub?.stripe_customer_id) {
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: "https://www.klarpakke.no/no/dashboard/settings",
      });
      portalUrl = session.url;
    }

    await resend.emails.send({
      from: "Klarpakke <post@klarpakke.no>",
      to: profile.email,
      subject: "Velkommen til Klarpakke! 🎉",
      html: `
        <h1>Hei ${profile.full_name || "der"}!</h1>
        <p>Takk for at du ble medlem av Klarpakke!</p>
        <p>Ditt abonnement: <strong>${planType}</strong> er nå aktivt.</p>
        <p>Du kan administrere abonnementet ditt her:</p>
        <a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px;">Gå til fakturering</a>
        <p>Har du spørsmål? Svar på denne emailen eller kontakt oss på post@klarpakke.no</p>
        <p>Mvh,<br>Team Klarpakke</p>
      `,
    });
  } catch (error) {
    console.error(
      "[Stripe Webhook] Feil ved sending av velkomst-email:",
      error,
    );
  }
}

async function sendPaymentFailedEmail(
  customerId: string,
  subscriptionId: string,
) {
  try {
    const supabase = getSupabase();
    const stripe = getStripe();

    // Hent bruker fra subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (!sub?.user_id) return;

    const resend = getResend();
    if (!resend) {
      console.warn(
        "[Stripe Webhook] RESEND_API_KEY mangler, hopper over payment-failed email",
      );
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email, full_name")
      .eq("id", sub.user_id)
      .single();

    if (!profile?.email) return;

    // Opprett billing portal for oppdatering av betalingsmåte
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://www.klarpakke.no/no/dashboard/settings",
    });

    await resend.emails.send({
      from: "Klarpakke <post@klarpakke.no>",
      to: profile.email,
      subject: "Betaling mislyktes - Oppdater dine betalingsopplysninger",
      html: `
        <h1>Hei ${profile.full_name || "der"}!</h1>
        <p>Vi kunne ikke trekke betalingen for ditt Klarpakke-abonnement.</p>
        <p>For å unngå avbrudd i tjenesten, vennligst oppdater dine betalingsopplysninger:</p>
        <a href="${session.url}" style="display:inline-block;padding:12px 24px;background:#EF4444;color:white;text-decoration:none;border-radius:8px;">Oppdater betalingsmåte</a>
        <p>Har du spørsmål? Kontakt oss på post@klarpakke.no</p>
        <p>Mvh,<br>Team Klarpakke</p>
      `,
    });
  } catch (error) {
    console.error(
      "[Stripe Webhook] Feil ved sending av payment failed email:",
      error,
    );
  }
}
