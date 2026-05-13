import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createHmac } from 'crypto';

export const runtime = 'nodejs';

const secret = process.env.SANITY_WEBHOOK_SECRET;
const SIGNATURE_HEADER_NAME = 'sanity-webhook-signature';

function isValidSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  const digest = hmac.digest('hex');
  return signature === digest;
}

/**
 * Sanity webhook handler
 * Revalidates cached Sanity content when editors publish changes
 *
 * Configure in Sanity Dashboard:
 * URL: https://klarpakke.no/api/webhooks/sanity
 * Trigger: Create, Update, Delete on documents
 * Projection: {_type, _id}
 * Secret: Set SANITY_WEBHOOK_SECRET in Vercel env
 */
export async function POST(req: NextRequest) {
  if (!secret) {
    console.error('[Sanity Webhook] SANITY_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { message: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const signature = req.headers.get(SIGNATURE_HEADER_NAME) ?? '';
  const body = await req.text();

  if (!isValidSignature(body, signature, secret)) {
    return NextResponse.json(
      { message: 'Invalid signature' },
      { status: 401 }
    );
  }

  try {
    const json = JSON.parse(body);
    const docType = json._type as string | undefined;

    // Revalidate general Sanity cache tag
    revalidateTag('sanity', 'default');

    // Revalidate specific tags based on document type
    if (docType) {
      revalidateTag(`sanity:${docType}`, 'default');
    }

    // Design tokens specifically
    if (docType === 'designTokens') {
      revalidateTag('sanity:designTokens', 'default');
    }

    // Also revalidate landing page specifically for landingContent changes
    if (docType === 'landingContent') {
      revalidateTag('sanity:landing', 'default');
    }

    // Revalidate strategy pages
    if (docType === 'strategy') {
      revalidateTag('sanity:strategy', 'default');
    }

    // Revalidate FAQ pages
    if (docType === 'faq') {
      revalidateTag('sanity:faq', 'default');
    }

    // Revalidate testimonials
    if (docType === 'testimonial') {
      revalidateTag('sanity:testimonial', 'default');
    }

    // Revalidate dynamic pages
    if (docType === 'page') {
      revalidateTag('sanity:page', 'default');
    }

    // Revalidate navigation
    if (docType === 'navigation') {
      revalidateTag('sanity:navigation', 'default');
    }

    return NextResponse.json({
      revalidated: true,
      type: docType,
      now: Date.now(),
    });
  } catch (err) {
    console.error('[Sanity Webhook] Failed to process webhook:', err);
    return NextResponse.json(
      { message: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
