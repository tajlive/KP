

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!key) return null;
  return createClient(url, key);
}

export async function GET() {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return NextResponse.json({ error: 'No database connection' }, { status: 503 });
  }

  try {
    // Get funnel stats for last 7 days
    const { data: stats, error } = await supabase
      .from('signup_funnel')
      .select('event_type, step_number, session_id')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // Calculate conversion at each step
    const steps = [
      { name: 'page_view', label: 'Så påmeldingsside', step: 1 },
      { name: 'form_start', label: 'Startet utfylling', step: 2 },
      { name: 'erfaring_selected', label: 'Valgte erfaring', step: 3 },
      { name: 'laeringsmaal_selected', label: 'Valgte læringsmål', step: 4 },
      { name: 'email_entered', label: 'Skrev e-post', step: 5 },
      { name: 'submit_attempted', label: 'Prøvde å sende', step: 6 },
      { name: 'success', label: 'Fullførte påmelding', step: 7 },
    ];

    const funnelData = steps.map((step, index) => {
      const uniqueUsers = new Set(
        stats?.filter(s => s.event_type === step.name).map(s => s.session_id) || []
      ).size;
      
      const prevStep = index > 0 ? steps[index - 1] : null;
      const prevCount = prevStep 
        ? new Set(stats?.filter(s => s.event_type === prevStep.name).map(s => s.session_id)).size
        : uniqueUsers;
      
      const dropOff = prevCount > 0 ? prevCount - uniqueUsers : 0;
      const dropOffRate = prevCount > 0 ? ((dropOff / prevCount) * 100).toFixed(1) : '0';
      
      return {
        ...step,
        uniqueUsers,
        dropOff,
        dropOffRate: parseFloat(dropOffRate),
        conversionFromStart: steps[0].name === step.name ? 100 : 
          Math.round((uniqueUsers / (stats?.filter(s => s.event_type === 'page_view').length || 1)) * 100),
      };
    });

    // Get error stats
    const errors = stats?.filter(s => s.event_type === 'error') || [];
    const errorTypes = errors.reduce((acc, err) => {
      // @ts-ignore
      const type = err.metadata?.error_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get total stats
    const totalPageViews = new Set(stats?.filter(s => s.event_type === 'page_view').map(s => s.session_id)).size;
    const totalSignups = new Set(stats?.filter(s => s.event_type === 'success').map(s => s.session_id)).size;
    const conversionRate = totalPageViews > 0 ? ((totalSignups / totalPageViews) * 100).toFixed(1) : '0';

    return NextResponse.json({
      funnel: funnelData,
      errors: errorTypes,
      summary: {
        totalPageViews,
        totalSignups,
        conversionRate: parseFloat(conversionRate),
        period: '7 dager',
      },
      updated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Funnel stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
