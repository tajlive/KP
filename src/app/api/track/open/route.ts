

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('id');
  const sequence = parseInt(searchParams.get('seq') || '1', 10);

  // Always return pixel, tracking is best-effort
  if (!contactId) {
    return new NextResponse(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/gif' },
    });
  }

  // Check environment variables at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    // Silently fail - just return pixel
    return new NextResponse(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/gif' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Logg åpning
    await supabase.from('email_tracking').insert({
      contact_id: contactId,
      sequence,
      event: 'open',
      user_agent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Oppdater kontakt status
    await supabase
      .from('campaign_contacts')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', contactId)
      .is('opened_at', null);

  } catch (error) {
    console.error('Tracking error:', error);
  }

  // Returner tracking pixel
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
