export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

/**
 * POST /api/webhooks/resend
 * 
 * Handle Resend webhook events for email delivery tracking
 * https://resend.com/docs/dashboard/webhooks
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { Webhook } from 'svix';

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

// Supabase admin client
const getSupabase = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

async function POSTHandler(request: Request, env: Env)(req: NextRequest) {
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
          .single();
        
        if (logEntry?.user_id) {
          await supabase
            .from('email_preferences')
            .update({ marketing_emails: false })
            .eq('user_id', logEntry.user_id);
        }
        break;
      }
      
      case 'email.opened': {
        // User opened email
        break;
      }
      
      case 'email.clicked': {
        // User clicked link in email
        break;
      }
      
      default:
    }
    
    return new Response(JSON.stringify({ received: true });
    
  } catch (error), { headers: { 'Content-Type': 'application/json' } }) {
    console.error('[Resend Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET for webhook verification
async function GETHandler(request: Request, env: Env)(req: NextRequest) {
  // Return 200 for webhook URL verification
  return new Response(JSON.stringify({ status: 'ok' }), { headers: { 'Content-Type': 'application/json' } });
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'POST') {
      return POSTHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
