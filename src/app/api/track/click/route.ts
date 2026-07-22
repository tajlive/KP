

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('id');
  const url = searchParams.get('url');
  const sequence = parseInt(searchParams.get('seq') || '1', 10);

  if (!contactId || !url) {
    return NextResponse.redirect('https://www.klarpakke.no');
  }

  // Check environment variables at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    // Silently redirect without tracking
    return NextResponse.redirect(url);
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // TODO: Opprett campaign_contacts- og email_tracking-tabeller i DB — mangler i supabase-typene
  const sb = supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{
            data: { email: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
      insert: (vals: Record<string, unknown>) => Promise<{
        error: { message: string } | null;
      }>;
      update: (vals: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };

  try {
    // Hent kontakt
    const { data: contact } = await sb
      .from('campaign_contacts')
      .select('email')
      .eq('id', contactId)
      .single();

    // Logg klikk
    await sb.from('email_tracking').insert({
      contact_id: contactId,
      email: contact?.email,
      sequence,
      event: 'click',
      url,
      user_agent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Oppdater kontakt
    await sb
      .from('campaign_contacts')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', contactId);

  } catch (error) {
    console.error('Click tracking error:', error);
  }

  // Redirect til mål-URL
  return NextResponse.redirect(url);
}
