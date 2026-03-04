/**
 * TRACKING SERVER FOR E-POST KAMPANJE
 * 
 * Tracke åpninger og klikk fra e-poster
 * Hostes som API route: /api/track/open og /api/track/click
 */

import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TrackingEvent {
  contactId: string;
  email: string;
  sequence: number;
  event: 'open' | 'click';
  userAgent?: string;
  ip?: string;
  timestamp: Date;
}

// ==================== TRACKING API ====================

export async function trackOpen(contactId: string, sequence: number, req: Request): Promise<Response> {
  // Logg åpning
  await supabase.from('email_tracking').insert({
    contact_id: contactId,
    sequence,
    event: 'open',
    user_agent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || 'unknown',
  });

  // Oppdater kontakt status
  await supabase
    .from('campaign_contacts')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', contactId);

  // Returner 1x1 transparent pixel
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  return new Response(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function trackClick(contactId: string, url: string, req: Request): Promise<Response> {
  // Hent kontakt
  const { data: contact } = await supabase
    .from('campaign_contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (!contact) {
    return Response.redirect(url, 302);
  }

  // Logg klikk
  await supabase.from('email_tracking').insert({
    contact_id: contactId,
    email: contact.email,
    sequence: contact.sequence,
    event: 'click',
    url,
    user_agent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || 'unknown',
  });

  // Oppdater kontakt
  await supabase
    .from('campaign_contacts')
    .update({ clicked_at: new Date().toISOString() })
    .eq('id', contactId);

  // Redirect til mål-URL
  return Response.redirect(url, 302);
}

// ==================== DATABASE SCHEMA ====================

/*
-- Opprett tabeller i Supabase:

CREATE TABLE campaign_contacts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  position TEXT,
  source TEXT,
  status TEXT DEFAULT 'pending',
  tags TEXT[],
  sequence INTEGER DEFAULT 1,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id TEXT REFERENCES campaign_contacts(id),
  email TEXT,
  sequence INTEGER,
  event TEXT, -- 'open', 'click', 'bounce', 'unsubscribe'
  url TEXT,
  user_agent TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Kun service role kan lese/skrive
CREATE POLICY "Service role only" ON campaign_contacts FOR ALL USING (false);
CREATE POLICY "Service role only" ON email_tracking FOR ALL USING (false);
*/
