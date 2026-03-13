/**
 * POST /api/webhooks/resend
 * 
 * Handle Resend webhook events for email delivery tracking
 * https://resend.com/docs/dashboard/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Webhook } from 'svix';

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

// Supabase admin client
const getSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const headers = req.headers;
    
    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const svixId = headers.get('svix-id');
      const svixTimestamp = headers.get('svix-timestamp');
      const svixSignature = headers.get('svix-signature');
      
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error('[Resend Webhook] Missing svix headers');
        return NextResponse.json(
          { error: 'Missing webhook headers' },
          { status: 400 }
        );
      }
      
      const wh = new Webhook(WEBHOOK_SECRET);
      try {
        wh.verify(payload, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch (err) {
        console.error('[Resend Webhook] Invalid signature:', err);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        );
      }
    }
    
    const event = JSON.parse(payload);
    const { type, data } = event;
    
    console.info(`[Resend Webhook] Event: ${type}`, data);
    
    const supabase = getSupabase();
    
    switch (type) {
      case 'email.sent': {
        // Email was sent successfully
        await supabase
          .from('email_log')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('resend_id', data.id);
        break;
      }
      
      case 'email.delivered': {
        // Email was delivered to recipient
        await supabase
          .from('email_log')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          })
          .eq('resend_id', data.id);
        break;
      }
      
      case 'email.delivery_delayed': {
        // Email delivery delayed (temporary issue)
        console.info(`[Resend Webhook] Delivery delayed for ${data.id}`);
        break;
      }
      
      case 'email.bounced': {
        // Email bounced
        await supabase
          .from('email_log')
          .update({
            status: 'bounced',
            error_message: data.reason || 'Bounced',
          })
          .eq('resend_id', data.id);
        
        // Optionally: Mark user email as invalid
        console.error(`[Resend Webhook] Email bounced: ${data.to}`, data.reason);
        break;
      }
      
      case 'email.complained': {
        // User marked email as spam
        await supabase
          .from('email_log')
          .update({
            status: 'failed',
            error_message: 'User marked as spam',
          })
          .eq('resend_id', data.id);
        
        // Disable marketing emails for this user
        const { data: logEntry } = await supabase
          .from('email_log')
          .select('user_id')
          .eq('resend_id', data.id)
          .single() as unknown;
        
        if (logEntry?.user_id) {
          await supabase
            .from('email_preferences')
            .update({ marketing_emails: false })
            .eq('user_id', logEntry.user_id);
          
          console.info(`[Resend Webhook] Disabled marketing emails for user ${logEntry.user_id}`);
        }
        break;
      }
      
      case 'email.opened': {
        // User opened email
        console.info(`[Resend Webhook] Email opened: ${data.id}`);
        break;
      }
      
      case 'email.clicked': {
        // User clicked link in email
        console.info(`[Resend Webhook] Link clicked in email: ${data.id}, link: ${data.link}`);
        break;
      }
      
      default:
        console.info(`[Resend Webhook] Unhandled event type: ${type}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('[Resend Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET for webhook verification
export async function GET(req: NextRequest) {
  // Return 200 for webhook URL verification
  return NextResponse.json({ status: 'ok' });
}
